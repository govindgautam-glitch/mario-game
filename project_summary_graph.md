# Studio i Mario Game — Complete Project Overview & Architecture Graphs

A comprehensive visual architectural map, technical summary, state machine diagrams, and component breakdown of all systems implemented in the project.

---

## 1. System Architecture & Module Dependency Graph

```mermaid
graph TD
    subgraph "Core Engine (HTML5 Canvas + Vanilla JS)"
        Index["index.html<br/>(DOM, Viewport & Script Cache-Busting)"]
        CSS["style.css<br/>(Arcade UI, Frosted Glass Modal, Fullscreen & Anchored HUD)"]
        Game["game.js<br/>(60FPS Loop, Aspect Ratio Manager & State Coordinator)"]
    end

    subgraph "Hardware & Input Layer"
        Input["input.js<br/>(Keyboard Listeners + Virtual Touch D-Pad + Jump Buffering)"]
        Audio["audio.js<br/>(Web Audio API 8-Bit Synth, Pipe SFX, Typewriter Beep & Dual-Zone BGM)"]
    end

    subgraph "Asset & Graphics Pipeline"
        Assets[("Raw Asset Images & Spritesheets")]
        Sprites["sprites.js<br/>(Slicing, Tight-Cropped Avatars, Pine Trunk Base Crop & Cache)"]
        Particles["particle.js<br/>(Debris, Sparkles, Fireworks, Floater Score Badges)"]
    end

    subgraph "Gameplay & Physics Entities"
        Player["player.js<br/>(Studio i Mario - Squash/Stretch Physics, 5-State Pipe FSM, Void Pit Falling)"]
        Enemy["enemy.js<br/>(Distraction Patrol AI, Velocity-Aware Stomp & Chasm Despawn)"]
        Level["level.js<br/>(3-Zone Tilemap, Seamless Mirror Parallax Engine, Solid Islands & Chasms)"]
    end

    subgraph "UI & Screen Layer"
        UI["ui.js<br/>(Fullscreen Toggle, Frosted Lore Modals, Leaderboards & HUD)"]
    end

    %% Connections
    Index --> Game
    CSS --> Index
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
    TITLE --> PLAYING : Press Start / Space / Click (Name Validated)

    state PLAYING {
        [*] --> Overworld_Day : Zone 1 (0 - 1520px)
        Overworld_Day --> PIPE_ENTERING_1 : Press [Down / S] on Entrance Pipe (1520px)
        PIPE_ENTERING_1 --> PIPE_TRAVEL_1 : Deliberate 0.85s Ease-In Sink (Rim Clipped)
        PIPE_TRAVEL_1 --> PIPE_EXITING_1 : 0.40s Dark Hold + Smooth Night Palette Fade
        PIPE_EXITING_1 --> Deep_Night_Underworld : Deliberate 0.85s Ease-Out Rise (Zone 2)
        
        Deep_Night_Underworld --> PIPE_ENTERING_2 : Press [Down / S] on Return Pipe (3280px)
        PIPE_ENTERING_2 --> PIPE_TRAVEL_2 : Deliberate 0.85s Ease-In Sink (Rim Clipped)
        PIPE_TRAVEL_2 --> PIPE_EXITING_2 : 0.40s Travel Hold + Smooth Day Palette Restore
        PIPE_EXITING_2 --> Sunset_Studio_i_Finale : Deliberate 0.85s Ease-Out Rise (Zone 3)
    }

    PLAYING --> MODAL_PAUSED : Hit '?' Block (Venture Mushroom Emerges & Walks Right)
    MODAL_PAUSED --> PLAYING : Press Space / Click Continue (Input & Jump-Buffer Flushed)

    PLAYING --> PAUSED : Press [P] or [Escape]
    PAUSED --> PLAYING : Press [P] or [Escape]

    PLAYING --> FLAGPOLE : Reach Studio i Flagpole
    FLAGPOLE --> VICTORY_WALK : Slide Down Pole & Victory SFX
    VICTORY_WALK --> VICTORY_SCREEN : Enter Studio i Building (Join Us Button + Results)

    PLAYING --> DEATH_KNOCKBACK : Hit by Distraction / Downward Acceleration into Pit
    DEATH_KNOCKBACK --> PLAYING : Lives > 0 (Respawn with BGM Restart)
    DEATH_KNOCKBACK --> GAMEOVER : Lives == 0

    GAMEOVER --> PLAYING : Restart Game [Space]
    VICTORY_SCREEN --> PLAYING : Play Again
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

    Player->>PipeIn: Stand on rim & press [Down / S] (State: NORMAL)
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

## 4. Continuous Parallax Background Engine (Seam Elimination)

```mermaid
graph TD
    subgraph "Parallax Calculation"
        Cam["camera.x"] --> Offset["parallaxX = camera.x * 0.25"]
        Viewport["viewportW = 960, viewportH = 540"] --> TileW["tileW = viewportH * (img.width / img.height) = 1080px"]
        Offset --> Span["firstTileIndex = Math.floor((parallaxX - 100) / tileW)<br/>numTiles = Math.ceil(viewportW / tileW) + 3"]
    end

    subgraph "Alternating Mirror Edge-Matching Engine"
        Span --> Loop["Iterate tileIndex from firstTile to firstTile + numTiles"]
        Loop --> DrawX["drawX = Math.floor(tileIndex * tileW - parallaxX)"]
        DrawX --> Check["tileIndex % 2 == 0 (Even) vs tileIndex % 2 == 1 (Odd)"]
        Check -->|Even: Normal| NormalTile["ctx.drawImage(img, drawX, 0, tileW + 1, H)"]
        Check -->|Odd: Mirrored| MirroredTile["ctx.translate(drawX + tileW, 0)<br/>ctx.scale(-1, 1)<br/>ctx.drawImage(img, 0, 0, tileW + 1, H)"]
    end

    subgraph "Zero-Seam Guarantee"
        NormalTile -.-> RightEdge["Right Edge of Normal Tile (Col -1)"]
        MirroredTile -.-> FlippedEdge["Left Edge of Mirrored Tile (Flipped Col -1)"]
        RightEdge ===|100% Identical Pixel Data| FlippedEdge
    end
```

---

## 5. Venture Brand Lore Card Word-Wrap & Modal Architecture

```mermaid
graph LR
    subgraph "Data & Typewriter Engine"
        Data["VENTURE_DATA<br/>(Full raw brand lore with spacing)"]
        Slice["uiManager.openVentureModal()<br/>(textContent = slice(0, idx))"]
        SFX["soundManager.playTextBeep()<br/>(Retro 8-bit typewriter audio blip)"]
    end

    subgraph "CSS Frosted-Glass Flexbox Hierarchy"
        Card[".modal-card<br/>(Frosted white glass rgba 235,245,255,0.26 + 14px blur + 4px dashed border)"]
        Icon[".modal-mushroom-container<br/>(Massive 320px tight-cropped zero-padding canvas avatar)"]
        Body[".modal-body<br/>(min-width: 0, flex-column, justify-between)"]
        Text["#modal-venture-text<br/>(white-space: pre-wrap, bold 11.5px white arcade font, 4-way stroke shadow)"]
        Footer[".modal-footer<br/>(Anchored bottom right)"]
        Btn["#modal-close-btn<br/>(Pink arcade CONTINUE [SPACE] button)"]
    end

    Data --> Slice
    Slice --> SFX
    Slice --> Text
    Card --> Icon
    Card --> Body
    Body --> Text
    Body --> Footer
    Footer --> Btn
```

---

## 6. Comprehensive Production Feature & Safety Matrix

| System / Feature | Root Cause / Challenge Addressed | Production Architecture & Verified Implementation |
| :--- | :--- | :--- |
| **Seamless Parallax Background** | Visible vertical seam line when tiling landscape art + sub-pixel hairline gaps. | **Alternating Horizontal Mirror Tiling**: Even tiles face forward, odd tiles face mirrored (`scale(-1,1)`). Adjacent edges share 100% identical pixel columns. Snapped to `Math.floor` with `+1px` bleed over 5200px level. |
| **Authoritative Pipe State Machine** | Previously fast 300-450ms cut with abrupt theme snapping. | **5-State Explicit FSM (`PIPE_STATE`)**: `PIPE_ENTERING` (0.85s ease-in sink with canvas rim clipping) ➔ `PIPE_TRAVEL` (0.40s dark hold with smooth palette fade) ➔ `PIPE_EXITING` (0.85s ease-out rise) ➔ `NORMAL` (0.6s cooldown, input unlocked). |
| **Venture Lore Modals** | Black box look, small avatar, overlapping text & jump bleed. | **Frosted White Glass UI**: `rgba(235,245,255,0.26)` + 14px blur + 4px dashed border. **320px massive tight-cropped mushroom avatar**, white arcade font with 4-way stroke, anchored pink `CONTINUE [SPACE]` button, typewriter audio blip, and jump-buffer flush. |
| **Open Pits / Chasms & Void Physics** | Dirt block under pine tree blocked pit visual; dying popped player 500px upward. | **Clean Trunk Base Crop**: Cropped `treePine` slice at trunk base (y=492, 172px h). Anchored trees to world ground islands. Added cliff-edge 3D shading and downward pit acceleration death (`die(true)`) with enemy despawn. |
| **Fullscreen Mode Toggle** | Canvas letterboxing broke on different aspect ratios / monitors. | Fullscreen API integration with `#app-wrapper:fullscreen` CSS & dynamic aspect-ratio preserved letterboxing in `game.resize()`. |
| **Coin Sprite Size & Clarity** | Small 32px coins with low contrast against bright sky. | Increased to 40x40px with high-res 48px offscreen canvas generator, dual-tone amber outline, specular highlights, and crisp badge text. |
| **Ground Horizontal Snapping** | Sub-pixel vertical dip treated ground tile as vertical wall. | Excluded `solid.type === 'ground'` from horizontal collision & added penetration threshold (`bounds.y + bounds.h > solid.y + 8`). |
| **Fast Fall Stomp Race** | High vertical speed overshoots static 24px stomp threshold. | Velocity-aware dynamic window: `enemyTop + Math.max(28, player.vy * dt)`. |
| **Mushroom Power-up Physics** | Previously static / bobbing in place. | Emerges vertically, walks continuously right at `vx = 90`, bounces on walls/pipes, falls with gravity. |
| **HUD Letterboxing Anchor** | Ultrawide viewport caused HUD to float in black letterbox borders. | HUD `#hud-overlay` anchored dynamically to canvas bounding box during `resize()`. |
| **Audio Toggle Mute** | Uninitialized AudioContext crashed or muted silently. | `soundManager.init()` called before `toggleMute()`. |
| **Enemy Damage Immunity in Pipes** | Enemies could collide and kill player during pipe transit. | Added `!player.isPipeTransitioning` guard to `enemy.js` collision check and `player.takeDamage()`. |
