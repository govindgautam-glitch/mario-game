# Studio i Mario Game — Complete Project Overview & Architecture Graphs

A comprehensive visual architectural map and summary of all systems, assets, state machines, and components implemented.

---

## 1. System Architecture & Module Dependency Graph

```mermaid
graph TD
    subgraph "Core Engine (HTML5 Canvas + Vanilla JS)"
        Index["index.html<br/>(DOM & Canvas Viewport)"]
        CSS["style.css<br/>(Arcade Theme, Anchored HUD & Modals)"]
        Game["game.js<br/>(60FPS Loop & State Coordinator)"]
    end

    subgraph "Hardware & Input Layer"
        Input["input.js<br/>(Keyboard + Virtual Touch D-Pad)"]
        Audio["audio.js<br/>(Web Audio API 8-Bit Synth + Pipe SFX)"]
    end

    subgraph "Asset & Graphics Pipeline"
        Assets[("Raw Asset Images & Video")]
        Sprites["sprites.js<br/>(Slicing & Offscreen Day/Night Canvas Cache)"]
        Particles["particle.js<br/>(Debris, Sparkles, Fireworks, Score)"]
    end

    subgraph "Gameplay & Physics Entities"
        Player["player.js<br/>(Studio i Mario - Physics, Stomp & Pipe Transitions)"]
        Enemy["enemy.js<br/>(Distraction Patrol & Velocity-Aware Stomp AI)"]
        Level["level.js<br/>(3-Zone Tilemap, Transition Pipes, Day/Night Theme Engine)"]
    end

    subgraph "UI & Story Layer"
        UI["ui.js<br/>(HUD, Space-Preserving Typewriter Lore Modals, Screens)"]
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
        Overworld_Day --> Pipe_Transition_Night : Down on Tall Pipe / Enter Zone 2
        Pipe_Transition_Night --> Deep_Night_Underground : 350ms Palette Crossfade
        Deep_Night_Underground --> Pipe_Transition_Day : Down on Short Pipe / Enter Zone 3
        Pipe_Transition_Day --> Sunset_Studio_i_Finale : 350ms Palette Crossfade
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

## 3. Interactive Day ↔ Night Pipe Theme Transition Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as Mario
    participant Pipe as Transition Pipe
    participant Level as Level Theme Engine
    participant Audio as SoundManager
    participant Renderer as Canvas Renderer

    Player->>Pipe: Stand on pipe top & press [Down / S]
    Player->>Audio: playPipe() retro SFX sweep
    Player->>Level: setTheme('night', 0.35)
    Level->>Audio: setZone('night') [BGM switch]
    loop 350ms Smooth Crossfade Easing
        Level->>Renderer: Update themeBlend (0.0 -> 1.0)
        Renderer->>Renderer: Alpha blend Sky, BrickNight, PipeNight, FloorNight
    end
    Player->>Player: Slide out at underground entrance (targetX, targetY)
```

---

## 4. Brand Lore Card Word-Wrap & Spacing Architecture

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

## 5. Collision & Physics Safety Matrix

| Collision Case | Root Cause / Risk | Implemented Production Fix |
| :--- | :--- | :--- |
| **Ground Horizontal Snapping** | Sub-pixel vertical dip treated ground tile as vertical wall. | Excluded `solid.type === 'ground'` from horizontal collision & added penetration threshold (`bounds.y + bounds.h > solid.y + 8`). |
| **Fast Fall Stomp Race** | High vertical speed overshoots static 24px stomp threshold. | Velocity-aware dynamic window: `enemyTop + Math.max(28, player.vy * dt)`. |
| **Mushroom Power-up Physics** | Previously static / bobbing in place. | Emerges vertically, walks continuously right at `vx = 90`, bounces on walls/pipes, falls with gravity. |
| **Modal Space Bleed** | Dismissing modal buffered Space causing instant jump. | `inputHandler.clearJustPressed()` & `player.jumpBufferTimer = 0` called inside `closeModal()`. |
| **HUD Letterboxing** | Ultrawide viewport caused HUD to float in black letterbox borders. | HUD `#hud-overlay` anchored dynamically to canvas bounding box during `resize()`. |
| **Audio Toggle Mute** | Uninitialized AudioContext crashed or muted silently. | `soundManager.init()` called before `toggleMute()`. |
