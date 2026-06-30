class SkywardScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SkywardScene' });
        this.bestTime = Number(localStorage.getItem('skyward-neon-best') || 0);
    }

    preload() {
        this.load.spritesheet('player', 'https://labs.phaser.io/assets/sprites/dude.png', {
            frameWidth: 32,
            frameHeight: 48
        });
    }

    create() {
        this.worldWidth = 4200;
        this.worldHeight = 760;
        this.startTime = this.time.now;
        this.hasFinished = false;
        this.touchState = { left: false, right: false, jump: false };

        this.createTextures();
        this.createWorld();
        this.createPlayer();
        this.createEffects();
        this.createUi();
        this.createInput();

        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.055);
        this.cameras.main.setZoom(1.15);
        this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight);
    }

    createTextures() {
        const graphics = this.add.graphics();

        graphics.fillStyle(0x0b0c18, 1);
        graphics.fillRoundedRect(0, 0, 400, 24, 4);
        graphics.fillStyle(0x00e5ff, 1);
        graphics.fillRect(0, 0, 400, 4);
        graphics.fillStyle(0xff3fb4, 0.9);
        graphics.fillRect(0, 20, 400, 2);
        graphics.lineStyle(1, 0x8dff65, 0.55);
        for (let x = 28; x < 400; x += 56) {
            graphics.lineBetween(x, 6, x + 20, 19);
        }
        graphics.generateTexture('ground', 400, 24);
        graphics.clear();

        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(4, 4, 4);
        graphics.generateTexture('particle', 8, 8);
        graphics.clear();

        this.createStarTexture(graphics, 'stars-far', 512, 320, 70, 0.55);
        this.createStarTexture(graphics, 'stars-near', 512, 320, 38, 0.9);

        graphics.fillStyle(0xfff260, 1);
        graphics.fillCircle(14, 14, 12);
        graphics.lineStyle(3, 0xffffff, 0.85);
        graphics.strokeCircle(14, 14, 8);
        graphics.generateTexture('beacon', 28, 28);
        graphics.clear();

        graphics.destroy();
    }

    createStarTexture(graphics, key, width, height, count, alpha) {
        graphics.clear();
        for (let i = 0; i < count; i += 1) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const radius = Phaser.Math.FloatBetween(0.7, 1.9);
            const color = Phaser.Display.Color.GetColor(
                Phaser.Math.Between(180, 255),
                Phaser.Math.Between(210, 255),
                Phaser.Math.Between(220, 255)
            );
            graphics.fillStyle(color, Phaser.Math.FloatBetween(alpha * 0.45, alpha));
            graphics.fillCircle(x, y, radius);
        }
        graphics.generateTexture(key, width, height);
    }

    createWorld() {
        const { width, height } = this.scale;
        this.bgFar = this.add.tileSprite(0, 0, width, height, 'stars-far')
            .setOrigin(0)
            .setAlpha(0.42)
            .setScrollFactor(0);
        this.bgNear = this.add.tileSprite(0, 0, width, height, 'stars-near')
            .setOrigin(0)
            .setAlpha(0.78)
            .setScrollFactor(0);

        this.platforms = this.physics.add.staticGroup();
        for (let x = 0; x < this.worldWidth; x += 400) {
            this.platforms.create(x, 600, 'ground').setOrigin(0, 0).refreshBody();
        }

        [
            { x: 520, y: 486 }, { x: 900, y: 420 }, { x: 1130, y: 275 },
            { x: 1500, y: 510 }, { x: 1850, y: 370 }, { x: 2230, y: 466 },
            { x: 2580, y: 314 }, { x: 2940, y: 410 }, { x: 3290, y: 520 },
            { x: 3620, y: 360 }
        ].forEach((platform) => {
            this.platforms.create(platform.x, platform.y, 'ground').setOrigin(0, 0).refreshBody();
        });

        this.finish = this.physics.add.staticSprite(3920, 548, 'beacon').setOrigin(0.5, 1);
        this.finishGlow = this.add.pointlight(3920, 548, 0xfff260, 180, 0.22);
    }

    createPlayer() {
        this.player = this.physics.add.sprite(100, 460, 'player');
        this.player.setBounce(0.08);
        this.player.setCollideWorldBounds(true);
        this.player.body.setSize(20, 42).setOffset(6, 6);

        this.physics.add.collider(this.player, this.platforms, this.handleLanding, null, this);
        this.physics.add.overlap(this.player, this.finish, this.finishRun, null, this);

        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [{ key: 'player', frame: 4 }],
            frameRate: 20
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('player', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });
    }

    createEffects() {
        this.dustEmitter = this.add.particles(0, 0, 'particle', {
            lifespan: 420,
            speed: { min: 18, max: 62 },
            angle: { min: 180, max: 360 },
            scale: { start: 0.55, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: [0x00e5ff, 0xff3fb4, 0x8dff65],
            emitting: false
        });

        this.finishEmitter = this.add.particles(3920, 548, 'particle', {
            lifespan: 900,
            speed: { min: 12, max: 42 },
            angle: { min: 230, max: 310 },
            scale: { start: 0.65, end: 0 },
            alpha: { start: 0.85, end: 0 },
            tint: 0xfff260,
            frequency: 80
        });
    }

    createUi() {
        this.statusText = this.add.text(18, 16, '', {
            fontFamily: 'Segoe UI, Arial, sans-serif',
            fontSize: '18px',
            color: '#f6fbff',
            stroke: '#050510',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(10);

        this.createTouchControls();
    }

    createTouchControls() {
        if (!this.sys.game.device.input.touch) {
            return;
        }

        const makeButton = (x, y, label) => {
            const button = this.add.container(x, y).setScrollFactor(0).setDepth(20);
            const bg = this.add.circle(0, 0, 34, 0x081523, 0.62)
                .setStrokeStyle(2, 0x00e5ff, 0.9);
            const text = this.add.text(0, -1, label, {
                fontFamily: 'Segoe UI, Arial, sans-serif',
                fontSize: '26px',
                color: '#ffffff'
            }).setOrigin(0.5);
            button.add([bg, text]);
            button.setSize(68, 68).setInteractive();
            return button;
        };

        this.leftButton = makeButton(58, this.scale.height - 62, '<');
        this.rightButton = makeButton(138, this.scale.height - 62, '>');
        this.jumpButton = makeButton(this.scale.width - 66, this.scale.height - 62, '^');

        this.bindTouchButton(this.leftButton, 'left');
        this.bindTouchButton(this.rightButton, 'right');
        this.bindTouchButton(this.jumpButton, 'jump');
    }

    bindTouchButton(button, key) {
        button.on('pointerdown', () => { this.touchState[key] = true; });
        button.on('pointerup', () => { this.touchState[key] = false; });
        button.on('pointerout', () => { this.touchState[key] = false; });
    }

    createInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
        this.scale.on('resize', this.handleResize, this);
    }

    handleResize(gameSize) {
        this.bgFar.setSize(gameSize.width, gameSize.height);
        this.bgNear.setSize(gameSize.width, gameSize.height);

        if (this.leftButton) {
            this.leftButton.setPosition(58, gameSize.height - 62);
            this.rightButton.setPosition(138, gameSize.height - 62);
            this.jumpButton.setPosition(gameSize.width - 66, gameSize.height - 62);
        }
    }

    handleLanding(player, platform) {
        if (player.body.velocity.y > 150) {
            this.dustEmitter.emitParticleAt(player.x, platform.y, 10);
        }
    }

    finishRun() {
        if (this.hasFinished) {
            return;
        }

        this.hasFinished = true;
        const elapsed = this.getElapsedSeconds();
        if (!this.bestTime || elapsed < this.bestTime) {
            this.bestTime = elapsed;
            localStorage.setItem('skyward-neon-best', String(elapsed));
        }
        this.cameras.main.flash(320, 255, 242, 96);
        this.finishEmitter.explode(48, this.finish.x, this.finish.y - 18);
    }

    getElapsedSeconds() {
        return Math.max(0, (this.time.now - this.startTime) / 1000);
    }

    update() {
        this.bgFar.tilePositionX = this.cameras.main.scrollX * 0.08;
        this.bgNear.tilePositionX = this.cameras.main.scrollX * 0.24;
        this.bgNear.tilePositionY = this.cameras.main.scrollY * 0.08;

        const movingLeft = this.cursors.left.isDown || this.touchState.left;
        const movingRight = this.cursors.right.isDown || this.touchState.right;
        const wantsJump = this.cursors.up.isDown || this.spaceKey.isDown || this.touchState.jump;
        const onGround = this.player.body.touching.down;

        if (movingLeft) {
            this.player.setVelocityX(-230);
            this.player.anims.play('left', true);
            this.emitRunDust(onGround, 1);
        } else if (movingRight) {
            this.player.setVelocityX(230);
            this.player.anims.play('right', true);
            this.emitRunDust(onGround, -1);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (wantsJump && onGround) {
            this.player.setVelocityY(-430);
            this.dustEmitter.emitParticleAt(this.player.x, this.player.y + 22, 12);
        }

        if (this.player.y > this.worldHeight - 16 || Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.resetPlayer();
        }

        const elapsed = this.getElapsedSeconds();
        const best = this.bestTime ? `  BEST ${this.bestTime.toFixed(1)}s` : '';
        this.statusText.setText(this.hasFinished ? `FINISH ${elapsed.toFixed(1)}s${best}` : `${elapsed.toFixed(1)}s${best}`);

        if (this.finishGlow) {
            this.finishGlow.intensity = 0.18 + Math.sin(this.time.now / 180) * 0.04;
        }
    }

    emitRunDust(onGround, direction) {
        if (!onGround || this.time.now % 3 > 1) {
            return;
        }
        this.dustEmitter.emitParticleAt(this.player.x - direction * 12, this.player.y + 22, 1);
    }

    resetPlayer() {
        this.cameras.main.shake(180, 0.009);
        this.player.setPosition(100, 460);
        this.player.setVelocity(0, 0);
        this.hasFinished = false;
        this.startTime = this.time.now;
    }
}

const config = {
    type: Phaser.AUTO,
    parent: document.body,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#050510',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 900 },
            debug: false
        }
    },
    scene: SkywardScene,
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        pixelArt: false
    }
};

new Phaser.Game(config);
