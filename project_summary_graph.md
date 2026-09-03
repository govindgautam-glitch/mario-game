# Studio i Mario Game — Complete Project Overview & Architecture Graphs

A comprehensive visual architectural map, technical summary, state machine diagrams, and component breakdown of all systems implemented in the project.

---

## 1. System Architecture & Module Dependency Graph

```mermaid
graph TD
    subgraph "Core Client Engine (HTML5 Canvas + Vanilla JS)"
        Index["index.html<br/>(DOM, Viewport, Touch Controls & Script Cache-Busting)"]
        CSS["style.css + mobile.css<br/>(Arcade UI, Frosted Glass Modal, Fullscreen, Responsive Reflow & Anchored HUD)"]
        Game["game.js<br/>(60FPS Loop, Aspect Ratio Manager, Global Leaderboard Sync & State Coordinator)"]
        Mobile["mobile.js<br/>(Touch Device Detection, Portrait Warning & Multitouch D-Pad/Actions)"]
    end

    subgraph "Hardware & Input Layer"
        Input["input.js<br/>(Keyboard Listeners + Virtual Touch D-Pad + Jump/Crouch Buffering)"]
        Audio["audio.js<br/>(Web Audio API 8-Bit Synth, Pipe SFX, Flag Fanfare Chime, Typewriter Beep & Dual-Zone BGM)"]
    end

    subgraph "Asset & Graphics Pipeline"
        Assets[("Raw Asset Images & Spritesheets")]
        Sprites["sprites.js<br/>(Slicing, Tight-Cropped Avatars, Independent Flag/Pole Slices & Cache)"]
        Particles["particle.js<br/>(Debris, Sparkles, Fireworks, Floater Score Badges)"]
    end

    subgraph "Gameplay & Physics Entities"
        Player["player.js<br/>(Studio i Mario - Squash/Stretch Physics, 5-State Pipe FSM, Void Pit Falling)"]
        Enemy["enemy.js<br/>(Distraction Patrol AI, Velocity-Aware Stomp & Chasm Despawn)"]
        Level["level.js<br/>(3-Zone Tilemap, Seamless Mirror Parallax Engine, 0.65s Flagpole Raise Animation)"]
    end

    subgraph "UI & Screen Layer"
        UI["ui.js<br/>(Fullscreen Toggle, Frosted Lore Modals, Dynamic Leaderboards & HUD)"]
    end

    subgraph "Backend & Cloud Persistence Layer"
        Server["server.js<br/>(Express REST API, Static Asset Server, Security Validation & Rate Limits)"]
        DB[("MongoDB Cloud Database<br/>(Score Schema, Descending Sorting & Indexes)")]
        LocalCache[("localStorage Fallback<br/>(Zero-Latency Offline Cache)")]
    end

    %% Connections
    Index --> Game
    CSS --> Index
    Mobile --> Input
    Mobile --> UI
    Assets --> Sprites
    Sprites --> Player
    Sprites --> Enemy
    Sprites --> Level
    Sprites --> UI

    Input --> Game
    Input --> Player
    Audio --> Game
    Audio --> Player
    Audio --> Enemy
    Audio --> Level
    Audio --> UI

    Game --> Player
    Game --> Enemy
    Game --> Level
    Game --> Particles
    Game --> UI
    Game <--> Server
    Game <--> LocalCache
    Server <--> DB

    Player <--> Level
    Player <--> Enemy
    Level --> Particles
    Enemy --> Particles
```

---

## 2. Master Game State Machine

```mermaid
stateDiagram-v2
    [*] --> LOADING : Page Load

    LOADING --> TITLE : Assets Sliced & Cached
    TITLE --> PLAYING : Press Start / Space / Tap (Name Validated)

    state PLAYING {
        [*] --> Overworld_Day : Zone 1 (0 - 1520px)
        Overworld_Day --> PIPE_ENTERING_1 : Reach / Step on Entrance Transition Pipe (1520px) [Auto-Trigger]
        PIPE_ENTERING_1 --> PIPE_TRAVEL_1 : Deliberate 0.85s Ease-In Sink (Rim Clipped)
        PIPE_TRAVEL_1 --> PIPE_EXITING_1 : 0.40s Dark Hold + Smooth Night Palette Fade
        PIPE_EXITING_1 --> Deep_Night_Underworld : Deliberate 0.85s Ease-Out Rise (Zone 2)
        
        Deep_Night_Underworld --> PIPE_ENTERING_2 : Reach / Step on Return Transition Pipe (3280px) [Auto-Trigger]
        PIPE_ENTERING_2 --> PIPE_TRAVEL_2 : Deliberate 0.85s Ease-In Sink (Rim Clipped)
        PIPE_TRAVEL_2 --> PIPE_EXITING_2 : 0.40s Travel Hold + Smooth Day Palette Restore
        PIPE_EXITING_2 --> Sunset_Studio_i_Finale : Deliberate 0.85s Ease-Out Rise (Zone 3)
    }

    PLAYING --> MODAL_PAUSED : Hit '?' Block (Venture Mushroom Emerges & Walks Right)
    MODAL_PAUSED --> PLAYING : Press Space / Click/Tap Continue (Input & Jump-Buffer Flushed)

    PLAYING --> PAUSED : Press [P] or [Escape]
    PAUSED --> PLAYING : Press [P] or [Escape]

    PLAYING --> FLAGPOLE : Reach Studio i Flagpole
    state FLAGPOLE {
        [*] --> Flag_Rising : Flagpole Touched (startFlagRaise)
        Flag_Rising --> Flag_Top_Flutter : 0.65s Ease-Out Cubic Rise + Fanfare Chime (playFlagDing)
        Flag_Rising --> Player_Slide : Mario slides down pole in counter-motion
    }
    FLAGPOLE --> VICTORY_WALK : Mario reaches ground
    VICTORY_WALK --> VICTORY_SCREEN : Walk to Studio i Building (Join Us Button + Global Ranking)

    PLAYING --> DEATH_KNOCKBACK : Hit by Distraction / Downward Acceleration into Pit
    DEATH_KNOCKBACK --> PLAYING : Lives > 0 (Respawn with BGM Restart)
    DEATH_KNOCKBACK --> GAMEOVER : Lives == 0

    GAMEOVER --> PLAYING : Restart Game [Space / Tap]
    VICTORY_SCREEN --> PLAYING : Play Again [Space / Tap]
```

---

## 3. Pipe Transition Explicit State Machine & Physics Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player (js/player.js)
    participant PipeIn as Entrance Pipe (Solid)
    participant Level as Level Coordinator (js/level.js)
    participant PipeOut as Destination Exit Pipe
    participant Audio as SoundManager (js/audio.js)
    participant Renderer as Canvas Renderer (ctx.clip)

    Player->>PipeIn: Reach/step on transition pipe rim (State: NORMAL, Auto-Trigger)
    Player->>Audio: playPipe() retro SFX sweep
    Note over Player,PipeIn: State: PIPE_ENTERING (0.85s, Ease-In)<br/>Lock controls & animate Y downward.<br/>Clip player canvas to region above pipe mouth rim.
    Player->>PipeIn: Submerge into pipe opening until 100% hidden
    
    Note over Player,Level: State: PIPE_TRAVEL (0.40s Dark Hold)<br/>Player 100% hidden, position inside destination exit pipe.<br/>Smooth palette fade begins here.
    Player->>Level: setTheme('night', 0.40)
    Level->>Audio: setZone('night') [BGM switch]
    Player->>PipeOut: Position inside destination exit pipe (Y = exitPipe.y + 16)
    
    Note over Player,PipeOut: State: PIPE_EXITING (0.85s, Ease-Out)<br/>Player visibly emerges from inside exit pipe.<br/>Clip player canvas to region above exit pipe rim.
    Player->>Audio: playPipe() emerge SFX
    loop 400ms Smooth Crossfade Easing
        Level->>Renderer: Update themeBlend (0.0 -> 1.0)
        Renderer->>Renderer: Alpha blend Sky, BrickNight, PipeNight, FloorNight
    end
    Player->>PipeOut: Rise up out of destination pipe rim
    Note over Player: State: NORMAL<br/>onGround = true, 0.6s cooldown, unlock player controls
```

---

## 4. Flagpole Smooth Raise & Victory Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player (js/player.js)
    participant Level as Level (js/level.js)
    participant Audio as SoundManager (js/audio.js)
    participant UI as UIManager (js/ui.js)

    Player->>Level: Touch flagpole bounding box (x=4400)
    Level->>Audio: playFlagpole() downward slide SFX
    Level->>Level: startFlagRaise() [flagProgress: 0 -> 1 over 0.65s]
    par Flag Rising & Player Slide
        Level->>Level: Flag moves from base (y=265) to top finial (y=128) with Ease-Out Cubic
        Player->>Player: Mario slides down the pole at vy = 170
    end
    Level->>Audio: playFlagDing() celebratory chime at top (E6/A6 fanfare)
    Level->>Level: Flag activates subtle sine flutter wave (Math.sin * 1.5px)
    Player->>Player: Mario reaches base ground, faces right (vx = 190)
    Player->>Audio: playVictory() retro victory fanfare
    Player->>Level: Mario walks into Studio i Building (x >= 4740)
    Level->>UI: triggerVictory() -> showVictoryScreen()
    UI->>UI: Post final score to MongoDB & render global ranking
```

---

## 5. Full-Stack MongoDB Leaderboard Architecture

```mermaid
graph TD
    subgraph "Browser Client (Vanilla JS)"
        Client["Game Engine (js/game.js, js/ui.js)"]
        LocalCache[("localStorage Cache (studio_mario_leaderboard)")]
    end

    subgraph "Backend API Server (Node.js + Express)"
        Express["Express Server (server.js)"]
        Validate["Input Validation (Name: 1-12 Chars, Score >= 0)"]
    end

    subgraph "Cloud Database Layer"
        MongoDB[("MongoDB Atlas (Score Collection)")]
    end

    Client -->|1. Immediate Local Save| LocalCache
    Client -->|2. Asynchronous POST /api/scores| Express
    Client -->|3. Asynchronous GET /api/leaderboard| Express
    Express --> Validate
    Validate -->|Mongoose Connection via .env| MongoDB
    MongoDB -->|Top 10 Descending Scores| Express
    Express -->|JSON Leaderboard Response| Client
    Client -.->|Offline/Disconnected Fallback| LocalCache
```

---

## 6. Mobile & Responsive Reflow Architecture

```mermaid
graph TD
    subgraph "Mobile Detection & Orientation (js/mobile.js)"
        Detect["checkDevice()<br/>(ontouchstart, maxTouchPoints, pointer: coarse)"]
        Orient["checkOrientation()<br/>(Portrait vs Landscape Window Ratio)"]
        Overlay["#rotate-device-overlay<br/>('Please Rotate Device' Animated Alert)"]
    end

    subgraph "Touch Input Subsystem"
        DPad["Touch D-Pad (◀, ▼/Pipe, ▶)"]
        Actions["Touch Actions (⚡ Sprint, ▲ Jump)"]
        InputHandler["inputHandler (input.js)<br/>(touchLeft, touchDown, touchRight, touchJump, touchSprint)"]
    end

    subgraph "Responsive UI & Modal Reflow (css/mobile.css)"
        ModalDesktop["Desktop Modal<br/>(Row Layout: 320px Icon + Long Lore Body)"]
        ModalMobile["Mobile Reflow (max-width: 768px)<br/>(Stacked Column: 100px Centered Icon + Fluid Font + 48px Tappable Button)"]
        ModalLandscape["Landscape Phone Reflow (max-height: 500px)<br/>(Compact Row: 110px Icon + Scrollable Body + Low Profile)"]
    end

    Detect -->|Touch Device Found| DPad
    Detect -->|Touch Device Found| Actions
    Detect --> Orient
    Orient -->|Portrait Mode Detected| Overlay
    DPad --> InputHandler
    Actions --> InputHandler
    ModalDesktop -.->|Screen <= 768px| ModalMobile
    ModalDesktop -.->|Height <= 500px| ModalLandscape
```

---

## 7. Comprehensive Production Feature & Safety Matrix

| System / Feature | Root Cause / Challenge Addressed | Production Architecture & Verified Implementation |
| :--- | :--- | :--- |
| **Seamless Parallax Background** | Visible vertical seam line when tiling landscape art + sub-pixel hairline gaps. | **Alternating Horizontal Mirror Tiling**: Even tiles face forward, odd tiles face mirrored (`scale(-1,1)`). Adjacent edges share 100% identical pixel columns. Snapped to `Math.floor` with `+1px` bleed over 5200px level. |
| **Authoritative Pipe State Machine** | Previously fast 300-450ms cut with abrupt theme snapping. | **5-State Explicit FSM (`PIPE_STATE`)**: `PIPE_ENTERING` (0.85s ease-in sink with canvas rim clipping) ➔ `PIPE_TRAVEL` (0.40s dark hold with smooth palette fade) ➔ `PIPE_EXITING` (0.85s ease-out rise) ➔ `NORMAL` (0.6s cooldown, input unlocked). |
| **Flagpole Raise Animation & Chime** | Flag was statically baked into pole and did not move when grabbed. | **Independent Slices & 0.65s Ease-Out**: `flagPoleOnly` (continuous shaft, finial, and base) and `flagBanner`. Rises smoothly from base to finial with cubic ease-out, celebratory `playFlagDing()` E6/A6 fanfare, and continuous wind flutter. |
| **MongoDB Global Leaderboard** | Local-only browser storage prevented cross-player competition. | **Full-Stack REST Backend (`server.js`)**: Express + Mongoose with secure `.env` connection, input validation (`name: 1-12 chars`, `score >= 0`), `GET /api/leaderboard`, and zero-latency `localStorage` offline fallback. |
| **Mobile & Touch Controls** | Mobile players could not move, jump, crouch, or enter pipes. | **`js/mobile.js` + `css/mobile.css`**: Touch detection, on-screen D-Pad (◀, ▼, ▶) and Action buttons (⚡, ▲) mapped to `inputHandler` with `touch-action: none` and safe-area notch insets. |
| **Mushroom Modal Mobile Reflow** | Desktop modal clipped on mobile screens with unreachable buttons. | **Stacked Responsive Reflow**: Automatically converts to a vertical flex-column on small screens with scaled 100px icon, fluid arcade typography (`clamp(9px, 2.8vw, 11px)`), and massive 48px tappable Continue button. |
| **Orientation Management** | Platformer gameplay broken in portrait mode. | **Portrait Rotation Alert (`#rotate-device-overlay`)**: Floating glassmorphism card with animated rotating phone icon prompting user to rotate to landscape. |
| **Venture Lore Modals (Desktop)** | Black box look, small avatar, overlapping text & jump bleed. | **Frosted White Glass UI**: `rgba(235,245,255,0.26)` + 14px blur + 4px dashed border. **320px massive tight-cropped mushroom avatar**, white arcade font with 4-way stroke, anchored pink `CONTINUE [SPACE]` button, typewriter audio blip, and jump-buffer flush. |
| **Open Pits / Chasms & Void Physics** | Dirt block under pine tree blocked pit visual; dying popped player 500px upward. | **Clean Trunk Base Crop**: Cropped `treePine` slice at trunk base (y=492, 172px h). Anchored trees to world ground islands. Added cliff-edge 3D shading and downward pit acceleration death (`die(true)`) with enemy despawn. |
| **Fullscreen Mode Toggle** | Canvas letterboxing broke on different aspect ratios / monitors. | Fullscreen API integration with `#app-wrapper:fullscreen` CSS & dynamic aspect-ratio preserved letterboxing in `game.resize()`. |
| **Coin Sprite Size & Clarity** | Small 32px coins with low contrast against bright sky. | Increased to 40x40px with high-res 48px offscreen canvas generator, dual-tone amber outline, specular highlights, and crisp badge text. |
| **Ground Horizontal Snapping** | Sub-pixel vertical dip treated ground tile as vertical wall. | Excluded `solid.type === 'ground'` from horizontal collision & added penetration threshold (`bounds.y + bounds.h > solid.y + 8`). |
| **Fast Fall Stomp Race** | High vertical speed overshoots static 24px stomp threshold. | Velocity-aware dynamic window: `enemyTop + Math.max(28, player.vy * dt)`. |
| **Mushroom Power-up Physics** | Previously static / bobbing in place. | Emerges vertically, walks continuously right at `vx = 90`, bounces on walls/pipes, falls with gravity. |
| **HUD Letterboxing Anchor** | Ultrawide viewport caused HUD to float in black letterbox borders. | HUD `#hud-overlay` anchored dynamically to canvas bounding box during `resize()`. |
| **Audio Toggle Mute** | Uninitialized AudioContext crashed or muted silently. | `soundManager.init()` called before `toggleMute()`. |
| **Enemy Damage Immunity in Pipes** | Enemies could collide and kill player during pipe transit. | Added `!player.isPipeTransitioning` guard to `enemy.js` collision check and `player.takeDamage()`. |
