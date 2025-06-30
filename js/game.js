window.onload = () => {
  // --- DOM Elements ---
  const ui = {
    score: document.getElementById("score"),
    timer: document.getElementById("timer"),
    gameOverModal: document.getElementById("game-over-modal"),
    finalScore: document.getElementById("final-score"),
    restartButton: document.getElementById("restart-button"),
    plasticCount: document.getElementById("plastic-count"),
    progression: {
      bottles: [
        document.getElementById("prog-bottle-1"),
        document.getElementById("prog-bottle-2"),
        document.getElementById("prog-bottle-3"),
      ],
      straws: [
        document.getElementById("prog-straw-1"),
        document.getElementById("prog-straw-2"),
        document.getElementById("prog-straw-3"),
      ],
      net: [document.getElementById("prog-net-1")],
    },
  };

  // --- Global State ---
  let totalPlasticCollected = localStorage.getItem("totalPlasticCollected")
    ? parseInt(localStorage.getItem("totalPlasticCollected"))
    : 0;
  ui.plasticCount.innerText = totalPlasticCollected;

  // --- Modal Control Functions ---
  function showGameOverModal(score) {
    ui.finalScore.innerText = score;
    ui.gameOverModal.style.display = "flex";
  }

  function hideGameOverModal() {
    ui.gameOverModal.style.display = "none";
  }

  // Hide the modal on initial page load
  hideGameOverModal();

  // --- Phaser Scene ---
  class GameScene extends Phaser.Scene {
    constructor() {
      super("GameScene");
    }

    // Initialize variables
    init() {
      this.score = 0;
      this.gameOver = false;
      this.collectedItems = { bottles: 0, straws: 0, nets: 0 };
      this.spawnedItems = { bottles: 0, straws: 0, nets: 0 }; // Track spawned items
    }

    preload() {
      // Sprites
      this.load.image("turtle", "assets/img/turtle.png");
      this.load.image("bottle", "assets/img/bottle.png");
      this.load.image("straw", "assets/img/straw1.png");
      this.load.image("net", "assets/img/net.png");
      this.load.image("fish", "assets/img/fish.webp");
      this.load.image("seaweed", "assets/img/seaweed.png");
    }

    create() {
      // Create a dynamic background that fills the container
      this.createOceanBackground();

      // Reset UI and hide modal
      this.updateProgressionUI(); // Reset UI to grayscale
      ui.score.innerText = "0";
      ui.timer.innerText = "30";
      hideGameOverModal();

      this.player = this.physics.add.sprite(400, 500, "turtle");
      this.player.setCollideWorldBounds(true).setScale(0.12); // Further reduced scale

      this.cursors = this.input.keyboard.createCursorKeys();

      // Create groups
      this.collectibles = this.physics.add.group();
      this.obstacles = this.physics.add.group();

      // Add collision overlaps
      this.physics.add.overlap(
        this.player,
        this.collectibles,
        this.collectItem,
        null,
        this
      );
      this.physics.add.overlap(
        this.player,
        this.obstacles,
        this.hitObstacle,
        null,
        this
      );

      // Setup game timer for 30 seconds
      this.gameTimer = this.time.addEvent({
        delay: 30000,
        callback: this.endGame,
        callbackScope: this,
      });

      // Spawn collectibles and obstacles periodically
      this.time.addEvent({
        delay: 2500,
        callback: this.trySpawnBottle,
        loop: true,
        callbackScope: this,
      });
      this.time.addEvent({
        delay: 3500,
        callback: this.trySpawnStraw,
        loop: true,
        callbackScope: this,
      });
      this.time.addEvent({
        delay: 8000,
        callback: this.trySpawnNet,
        loop: true,
        callbackScope: this,
      });
      this.time.addEvent({
        delay: 2000,
        callback: this.spawnFish,
        loop: true,
        callbackScope: this,
      });
      this.time.addEvent({
        delay: 3000,
        callback: this.spawnSeaweed,
        loop: true,
        callbackScope: this,
      });
    }

    createOceanBackground() {
      const width = this.game.config.width;
      const height = this.game.config.height;

      const graphics = this.add.graphics();
      graphics.fillGradientStyle(0x00b8d4, 0x00b8d4, 0x005a9e, 0x005a9e, 1);
      graphics.fillRect(0, 0, width, height);
      // Generate a texture from the graphics object
      graphics.generateTexture("ocean_bg", width, height);
      graphics.destroy(); // Clean up the graphics object

      // Add the generated texture as a background image
      this.add.image(0, 0, "ocean_bg").setOrigin(0, 0);

      // Create a dynamic bubble texture
      const bubbleGraphics = this.make.graphics({ x: 0, y: 0 }, false);
      bubbleGraphics.fillStyle(0xffffff, 0.4);
      bubbleGraphics.fillCircle(10, 10, 10);
      bubbleGraphics.generateTexture("bubble", 20, 20);
      bubbleGraphics.destroy();

      // Add particle emitter for bubbles
      const particles = this.add.particles("bubble");
      particles.createEmitter({
        x: { min: 0, max: this.game.config.width },
        y: this.game.config.height + 50,
        lifespan: 5000,
        speedY: { min: -150, max: -50 },
        scale: { start: 0.1, end: 0.6 },
        blendMode: "ADD",
        frequency: 200,
      });
    }

    update() {
      if (this.gameOver) {
        return;
      }
      this.handlePlayerMovement();
      this.updateTimerDisplay();
    }

    handlePlayerMovement() {
      this.player.setVelocity(0);
      const speed = 500; // Increased speed
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-speed);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(speed);
      }
      if (this.cursors.up.isDown) {
        this.player.setVelocityY(-speed);
      } else if (this.cursors.down.isDown) {
        this.player.setVelocityY(speed);
      }
    }

    updateTimerDisplay() {
      const remaining = Math.ceil(
        (this.gameTimer.delay - this.gameTimer.getElapsed()) / 1000
      );
      ui.timer.innerText = remaining > 0 ? remaining : 0;
    }

    trySpawnBottle() {
      if (this.spawnedItems.bottles < 3) {
        this.spawnAnItem("bottle", this.collectibles);
        this.spawnedItems.bottles++;
      }
    }

    trySpawnStraw() {
      if (this.spawnedItems.straws < 3) {
        this.spawnAnItem("straw", this.collectibles);
        this.spawnedItems.straws++;
      }
    }

    trySpawnNet() {
      if (this.spawnedItems.nets < 1) {
        this.spawnAnItem("net", this.collectibles);
        this.spawnedItems.nets++;
      }
    }

    spawnFish() {
      const y = Phaser.Math.Between(50, 450);
      const x = Math.random() < 0.5 ? -50 : 850; // Start off-screen
      const speed =
        (Math.random() < 0.5 ? 1 : -1) * Phaser.Math.Between(100, 250);
      const fish = this.obstacles.create(x, y, "fish");
      fish.setVelocityX(speed).setScale(0.15).setImmovable(true); // Uniform smaller scale
      if (speed > 0) {
        fish.flipX = true;
      }
    }

    spawnSeaweed() {
      const x = Phaser.Math.Between(50, 750);
      this.obstacles.create(x, 650, "seaweed").setVelocityY(-90).setScale(0.2); // Adjusted scale
    }

    spawnAnItem(type, group) {
      const x = Phaser.Math.Between(50, 750);
      const y = Phaser.Math.Between(0, 150);
      const item = group.create(x, y, type);

      let scale = 0.15; // Default item scale
      if (type === "straw") {
        scale = 0.1; // Make straws even smaller
      }

      item
        .setData("type", type)
        .setScale(scale)
        .setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(40, 80)); // Add slight drift
    }

    collectItem(player, item) {
      const type = item.getData("type");

      // Only collect if it's part of the quest and not already maxed out
      if (type === "bottle" && this.collectedItems.bottles < 3) {
        this.collectedItems.bottles++;
      } else if (type === "straw" && this.collectedItems.straws < 3) {
        this.collectedItems.straws++;
      } else if (type === "net" && this.collectedItems.nets < 1) {
        this.collectedItems.nets++;
      } else {
        return; // Already collected max of this type
      }

      item.disableBody(true, true);

      this.score += 25; // More points for quest items
      ui.score.innerText = this.score;

      totalPlasticCollected++;
      ui.plasticCount.innerText = totalPlasticCollected;
      localStorage.setItem("totalPlasticCollected", totalPlasticCollected);

      this.updateProgressionUI();
      this.checkOutfits(); // Keep the tinting fun
    }

    hitObstacle(player, obstacle) {
      obstacle.disableBody(true, true);
      this.score -= 10;
      ui.score.innerText = this.score;

      // Add a visual feedback for getting hit
      this.cameras.main.shake(100, 0.01);
      player.setTint(0xff0000);
      this.time.addEvent({ delay: 200, callback: () => player.clearTint() });
    }

    updateProgressionUI() {
      Object.keys(ui.progression).forEach((itemType) => {
        const count = this.collectedItems[itemType] || 0;
        ui.progression[itemType].forEach((img, index) => {
          if (index < count) {
            img.classList.add("collected");
          } else {
            img.classList.remove("collected");
          }
        });
      });
    }

    checkOutfits() {
      if (this.collectedItems.bottles === 3) this.player.setTint(0xffc0cb);
      if (this.collectedItems.straws === 3) this.player.setTint(0xffff00);
      if (this.collectedItems.nets === 1) this.player.setTint(0x8b4513);
    }

    endGame() {
      this.gameOver = true;
      this.physics.pause();
      this.player.setTint(0xff0000);
      showGameOverModal(this.score);
    }
  }

  // --- Game Configuration ---
  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: "game-container",
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
      },
    },
    scene: GameScene,
  };

  // --- Initialize Game ---
  const game = new Phaser.Game(config);

  // --- Global Event Listener ---
  ui.restartButton.addEventListener("click", () => {
    // Hide modal immediately for better UX
    hideGameOverModal();
    // Access the scene to restart it
    const scene = game.scene.getScene("GameScene");
    scene.scene.restart();
  });
};
