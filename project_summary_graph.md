# Studio i Mario Game — Complete Project Overview & Architecture Graphs

A visual architectural map and summary of all systems, assets, state machines, and components implemented so far.

---

## 1. System Architecture & Module Dependency Graph

```mermaid
graph TD
    subgraph "Core Engine (HTML5 Canvas + Vanilla JS)"
        Index["index.html<br/>(DOM & Canvas Viewport)"]
        CSS["style.css<br/>(Arcade Theme & Modals)"]
        Game["game.js<br/>(60FPS Loop & State Coordinator)"]
    end

    subgraph "Hardware & Input Layer"
        Input["input.js<br/>(Keyboard + Virtual Touch D-Pad)"]
        Audio["audio.js<br/>(Web Audio API 8-Bit Synth)"]
    end

    subgraph "Asset & Graphics Pipeline"
        Assets[("Raw Asset Images & Video")]
        Sprites["sprites.js<br/>(Slicing & Offscreen Canvas Cache)"]
        Particles["particle.js<br/>(Debris, Sparkles, Fireworks, Score)"]
    end

    subgraph "Gameplay & Physics Entities"
        Player["player.js<br/>(Studio i Mario - Physics & States)"]
        Enemy["enemy.js<br/>(Distraction Patrol & Stomp AI)"]
        Level["level.js<br/>(3-Zone Tilemap, Solids, Pipes, Blocks)"]
    end

    subgraph "UI & Story Layer"
        UI["ui.js<br/>(HUD, Typewriter Lore Modals, Screens)"]
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
    TITLE --> PLAYING : Press Start / Space / Click

    state PLAYING {
        [*] --> Overworld_Day : Zone 1 (0 - 1500px)
        Overworld_Day --> Underground_Night : Zone 2 (1500 - 3100px)
        Underground_Night --> Sunset_Finale : Zone 3 (3100 - 5200px)
    }

    PLAYING --> MODAL_PAUSED : Hit '?' Block (Venture Mushroom Emerges)
    MODAL_PAUSED --> PLAYING : Press Space / Click Continue

    PLAYING --> PAUSED : Press [P] or [Escape]
    PAUSED --> PLAYING : Press [P] or [Escape]

    PLAYING --> FLAGPOLE : Reach Studio i Flagpole
    FLAGPOLE --> VICTORY_WALK : Slide Down Pole
    VICTORY_WALK --> VICTORY_SCREEN : Enter Studio i Building (Fireworks)

    PLAYING --> DEATH_KNOCKBACK : Hit by Distraction / Fall in Pit
    DEATH_KNOCKBACK --> PLAYING : Lives > 0 (Respawn)
    DEATH_KNOCKBACK --> GAMEOVER : Lives == 0

    GAMEOVER --> PLAYING : Restart Game
    VICTORY_SCREEN --> PLAYING : Play Again
```

---

## 3. Player Physics & Animation State Flow

```mermaid
stateDiagram-v2
    [*] --> Idle

    state "On Ground" as Grounded {
        Idle --> Running : [A] / [D] / Move
        Running --> Idle : No Input (Friction Decel)
        Running --> Skidding : Sudden Direction Flip
        Skidding --> Running : Turnaround Complete
    }

    Grounded --> Jumping : [Space] / [W] / [Up] (Jump Force)
    Grounded --> Falling : Walk off Ledge (Coyote Time Window: 0.12s)

    state "In Air" as Airborne {
        Jumping --> Falling : Reached Apex / Release Jump Key
        Falling --> Landing : Collide Surface from Top
    }

    Landing --> Idle : Land on Solid Ground

    Grounded --> SlidingFlag : Grab Flagpole (19.png)
    Airborne --> SlidingFlag : Grab Flagpole (19.png)
    SlidingFlag --> AutoWalk : Reach Base of Pole
    AutoWalk --> EnteredBuilding : Enter Studio i HQ

    Grounded --> Hurt : Touch Enemy Side / Pit
    Airborne --> StompEnemy : Fall on Enemy Head (Bounce Boost)
    StompEnemy --> Falling
```

---

## 4. Venture Mushroom Lore & Startup Progression Map

```mermaid
flowchart LR
    Start([Mario Start]) --> Z1[Zone 1: Overworld Day]
    
    subgraph "Day Overworld (Tutorial & First Ventures)"
        Z1 --> V1["🍄 INNOVHER<br/>Venture Studio for Early-Stage Founders"]
        V1 --> V2["🍄 INNOVEDA AI<br/>End-to-End Custom AI Infra"]
    end

    Z1 --> Z2[Zone 2: Deep Night / Underworld]

    subgraph "Night Underworld (Advanced Platforming)"
        Z2 --> V3["🍄 INNOVIDEA<br/>Integrated Marketing & Digital Growth"]
        Z2 --> V4["🍄 BHARAT VENTURES<br/>India-First Policy & Innovation Ecosystem"]
        Z2 --> V5["🍄 ENCODE<br/>AI Phygital Learning Network"]
    end

    Z2 --> Z3[Zone 3: Sunset Finale]

    subgraph "Finale & Goal"
        Z3 --> V6["🍄 BEYOND ABILITY X<br/>Professional Ecosystem for Athletes"]
        V6 --> Flag["🚩 Studio i Flagpole<br/>(19.png)"]
        Flag --> HQ["🏢 Studio i Headquarters<br/>(Mario Studio i Final Building.png)"]
        HQ --> Victory["🏆 Victory Modal<br/>'JOIN US' Button"]
    end
```

---

## 5. Completed Work Matrix

| Component | Status | Summary |
| :--- | :---: | :--- |
| **Asset Analysis** | ✅ | Extracted dimensions, bounding boxes, alpha masks for all 21 files. |
| **Sprites Engine** | ✅ | Precise sprite-slicing for Mario, Distraction, bricks, question box, pipes, trees, mushrooms, flagpole, building. |
| **Player Controller** | ✅ | Variable-arc jump, coyote time, jump buffer, run cycles, skidding, hurt/death states. |
| **Enemy AI** | ✅ | Distraction Goomba with obstacle bounce patrol and stomp-squash interaction. |
| **Level Architecture** | ✅ | 5200px 3-zone connected map (Day → Night → Sunset) with parallax layers and pits. |
| **Interactive Modals** | ✅ | Dashed retro spotlight cards with animated mushrooms & typewriter narrative text. |
| **Audio Engine** | ✅ | 8-bit chiptune sound generator using Web Audio API for Day/Night BGM and SFX. |
| **Arcade HUD & UI** | ✅ | Retro score, coins counter, world tracker, timer, lives indicator, touch controls. |
| **Endgame Sequence** | ✅ | Flagpole slide down, studio entrance, fireworks celebration, and Join Us CTA button. |
