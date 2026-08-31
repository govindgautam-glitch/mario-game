# Studio i Mario Game — Complete Project Overview & Architecture Graphs

A comprehensive visual architectural map and summary of all systems, assets, state machines, and components implemented.

---

## 1. System Architecture & Module Dependency Graph

```mermaid
graph TD
    subgraph "Core Engine (HTML5 Canvas + Vanilla JS)"
        Index["index.html<br/>(DOM & Canvas Viewport)"]
        CSS["style.css<br/>(Arcade Theme, Anchored HUD, Fullscreen & Modals)"]
        Game["game.js<br/>(60FPS Loop & State Coordinator)"]
    end

    subgraph "Hardware & Input Layer"
        Input["input.js<br/>(Keyboard + Virtual Touch D-Pad)"]
        Audio["audio.js<br/>(Web Audio API 8-Bit Synth + Pipe SFX)"]
    end

    subgraph "Asset & Graphics Pipeline"
        Assets[("Raw Asset Images & Video")]
        Sprites["sprites.js<br/>(Slicing, 48px Crisp Coins & Day/Night Canvas Cache)"]
        Particles["particle.js<br/>(Debris, Sparkles, Fireworks, Score)"]
    end

    subgraph "Gameplay & Physics Entities"
        Player["player.js<br/>(Studio i Mario - Physics, Stomp, Pipe Sink/Emerge Transitions)"]
        Enemy["enemy.js<br/>(Distraction Patrol & Velocity-Aware Stomp AI)"]
        Level["level.js<br/>(3-Zone Tilemap, Transition Pipes, Day/Night Theme Engine, 40px Coins)"]
    end

    subgraph "UI & Screen Layer"
        UI["ui.js<br/>(HUD Controls, Fullscreen Toggle, Lore Modals, Screens)"]
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

## 2. Game State Machine Flowchart

```mermaid
stateDiagram-v2
    [*] --> LOADING : Page Load

    LOADING --> TITLE : Assets Sliced & Cached
    TITLE --> PLAYING : Press Start / Space / Click (Name Validated)

    state PLAYING {
        [*] --> Overworld_Day : Zone 1 (0 - 1520px)
        Overworld_Day --> Pipe_Descent : Down on Tall Pipe (1520px)
        Pipe_Descent --> Theme_Crossfade_Night : Sink Complete (450ms, Mouth Clipped)
        Theme_Crossfade_Night --> Pipe_Emerge_Night : Teleport to Underground Pipe
        Pipe_Emerge_Night --> Deep_Night_Underground : Rise Complete (450ms)
        
        Deep_Night_Underground --> Pipe_Descent_Return : Down on Return Pipe (3280px)
        Pipe_Descent_Return --> Theme_Crossfade_Day : Sink Complete (450ms)
        Theme_Crossfade_Day --> Pipe_Emerge_Day : Teleport to Day Exit Pipe
        Pipe_Emerge_Day --> Sunset_Studio_i_Finale : Rise Complete (450ms)
    }

    PLAYING --> MODAL_PAUSED : Hit '?' Block (Venture Mushroom Emerges & Walks Right)
    MODAL_PAUSED --> PLAYING : Press Space / Click Continue (Input Cleared, No Jump)

    PLAYING --> PAUSED : Press [P] or [Escape]
    PAUSED --> PLAYING : Press [P] or [Escape]

    PLAYING --> FLAGPOLE : Reach Studio i Flagpole
    FLAGPOLE --> VICTORY_WALK : Slide Down Pole
    VICTORY_WALK --> VICTORY_SCREEN : Enter Studio i Building (Join Us Button + Results)

    PLAYING --> DEATH_KNOCKBACK : Hit by Distraction / Fall in Pit
    DEATH_KNOCKBACK --> PLAYING : Lives > 0 (Respawn with BGM Restart)
    DEATH_KNOCKBACK --> GAMEOVER : Lives == 0

    GAMEOVER --> PLAYING : Restart Game [Space]
    VICTORY_SCREEN --> PLAYING : Play Again
```

---

## 3. Realistic Two-Phase Pipe Descent & Emerge Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Player as Mario
    participant PipeIn as Entrance Pipe (1520px)
    participant Level as Level Theme Engine
    participant Audio as SoundManager
    participant PipeOut as Exit Pipe (1780px)
    participant Renderer as Canvas Renderer

    Player->>PipeIn: Stand on pipe rim & press [Down / S]
    Player->>Audio: playPipe() retro SFX sweep
    Note over Player,PipeIn: Phase 1: Descent (450ms)<br/>Lock controls & animate Y downward.<br/>Clip player canvas to above pipe mouth rim.
    Player->>PipeIn: Submerge into pipe opening
    
    Note over Player,Level: Phase 1 Complete -> Trigger Teleport & Theme Transition
    Player->>Level: setTheme('night', 0.35)
    Level->>Audio: setZone('night') [BGM switch]
    Player->>PipeOut: Teleport inside destination pipe (Y = pipe.y + 12)
    Player->>Audio: playPipe() emerge SFX
    
    Note over Player,PipeOut: Phase 2: Emerge (450ms)<br/>Animate Y upward.<br/>Clip player canvas to above exit pipe rim.
    loop 350ms Smooth Crossfade Easing
        Level->>Renderer: Update themeBlend (0.0 -> 1.0)
        Renderer->>Renderer: Alpha blend Sky, BrickNight, PipeNight, FloorNight
    end
    Player->>PipeOut: Rise up out of destination pipe rim
    Player->>Player: Transition Complete: onGround = true, unlock player controls
```

---

## 4. Fullscreen Mode & Dynamic Resize Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as Player
    participant Btn as #btn-toggle-fullscreen
    participant UI as UIManager
    participant Doc as Browser Fullscreen API
    participant Game as Game.resize()
    participant HUD as #hud-overlay

    User->>Btn: Click Fullscreen Button
    Btn->>UI: Request Fullscreen Toggle
    alt Enter Fullscreen
        UI->>Doc: appWrapper.requestFullscreen()
        Doc->>UI: 'fullscreenchange' event fired
        UI->>Btn: Set text "🗗 Exit", toggle .active class
    else Exit Fullscreen / [Escape] Pressed
        UI->>Doc: document.exitFullscreen()
        Doc->>UI: 'fullscreenchange' event fired
        UI->>Btn: Set text "⛶ Fullscreen", remove .active class
    end
    Doc->>Game: trigger game.resize()
    Game->>Game: Compute max viewport bounds & 16:9 scale factor
    Game->>HUD: Anchor width & offset directly to rendered canvas letterbox
```

---

## 5. Brand Lore Card Word-Wrap & Spacing Architecture

```mermaid
graph LR
    subgraph "Data & Typewriter Engine"
        Data["VENTURE_DATA<br/>(Full raw copy with spaces)"]
        Slice["uiManager.openVentureModal()<br/>(textContent = slice(0, idx))"]
    end

    subgraph "CSS Flexbox Hierarchy"
        Card[".modal-card<br/>(90% width, dashed border, flex-row)"]
        Icon[".modal-mushroom-container<br/>(Fixed width 120px)"]
        Body[".modal-body<br/>(min-width: 0, flex-column, justify-between)"]
        Text["#modal-venture-text<br/>(white-space: pre-wrap, word-break: break-word, max-height: 180px, scrollable)"]
        Footer[".modal-footer<br/>(Anchored at bottom right)"]
        Btn["#modal-close-btn<br/>(CONTINUE [SPACE])"]
    end

    Data --> Slice
    Slice --> Text
    Card --> Icon
    Card --> Body
    Body --> Text
    Body --> Footer
    Footer --> Btn
```

---

## 6. Collision & Physics Safety Matrix

| Feature / Collision Case | Root Cause / Risk | Implemented Production Fix |
| :--- | :--- | :--- |
| **Fullscreen Mode Toggle** | Canvas letterboxing broke on different aspect ratios / monitors. | Fullscreen API integration with `#app-wrapper:fullscreen` CSS & dynamic aspect-ratio preserved letterboxing in `game.resize()`. |
| **Realistic Pipe Descent/Emerge** | Previously instant cut / teleport with no animation. | Two-phase transition (`descend` ➔ `emerge`) with canvas mouth-clipping (`ctx.clip()`) and synced pipe SFX before theme crossfade. |
| **Coin Sprite Size & Clarity** | Small 32px coins with low contrast against bright sky. | Increased to 40x40px with high-res 48px offscreen canvas generator, dual-tone amber outline, specular highlights, and crisp badge text. |
| **Ground Horizontal Snapping** | Sub-pixel vertical dip treated ground tile as vertical wall. | Excluded `solid.type === 'ground'` from horizontal collision & added penetration threshold (`bounds.y + bounds.h > solid.y + 8`). |
| **Fast Fall Stomp Race** | High vertical speed overshoots static 24px stomp threshold. | Velocity-aware dynamic window: `enemyTop + Math.max(28, player.vy * dt)`. |
| **Mushroom Power-up Physics** | Previously static / bobbing in place. | Emerges vertically, walks continuously right at `vx = 90`, bounces on walls/pipes, falls with gravity. |
| **Modal Space Bleed** | Dismissing modal buffered Space causing instant jump. | `inputHandler.clearJustPressed()` & `player.jumpBufferTimer = 0` called inside `closeModal()`. |
| **HUD Letterboxing** | Ultrawide viewport caused HUD to float in black letterbox borders. | HUD `#hud-overlay` anchored dynamically to canvas bounding box during `resize()`. |
| **Audio Toggle Mute** | Uninitialized AudioContext crashed or muted silently. | `soundManager.init()` called before `toggleMute()`. |
