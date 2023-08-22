/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

import * as THREE from 'three';

const { Assets, EditorHelpers, InputHandler, MenuInputs, PartyMessageHelper, ProjectHandler, PubSub, SettingsHandler, UserController, getDeviceType, isEditor, utils } = window.DigitalBacon;
const { System } = Assets;
const { SystemHelper, EditorHelperFactory } = EditorHelpers;
const { NumberInput } = MenuInputs;
const { numberOr } = utils;
const deviceType = getDeviceType();

export default class JumpSystem extends System {
    constructor(params = {}) {
        params['assetId'] = JumpSystem.assetId;
        super(params);
        this._gravity = numberOr(params['gravity'], 9.8);
        this._initialVelocity = numberOr(params['initialVelocity'], 5);
        this._maxVelocitySustainHeight
            = numberOr(params['maxVelocitySustainHeight'], 0);
        this._terminalVelocity = numberOr(params['terminalVelocity'], 30);
        this._jumpTopic = this._id + ':Jump';
        this._jumpingDetails = [];
        if(isEditor()) this.update = null;
    }

    _addSubscriptions() {
        SettingsHandler.setUserSetting('Enable Flying', false);
        SettingsHandler.setEditorSetting('Enable Flying', false);
        PubSub.subscribe(this._id, 'SETTINGS_UPDATED', (message) => {
            SettingsHandler.setUserSetting('Enable Flying', false, true);
        });
        this._subscriptionTopics.push('SETTINGS_UPDATED');
        PartyMessageHelper.registerBlockableHandler(this._jumpTopic,
            (p, m) => { this._handleJump(p, m); });
        if(deviceType == 'MOBILE') {
            let jumpButton = InputHandler.addExtraControlsButton(
                'jump-button-' + this._id, 'JUMP');
            jumpButton.addEventListener('touchstart',
                () => { this._mobileJumpPressed = true; });
            jumpButton.addEventListener('touchend',
                () => { this._mobileJumpPressed = false; });
        }
    }

    _getDefaultName() {
        return JumpSystem.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['gravity'] = this._gravity;
        params['initialVelocity'] = this._initialVelocity;
        params['maxVelocitySustainHeight'] = this._maxVelocitySustainHeight;
        params['terminalVelocity'] = this._terminalVelocity;
        return params;
    }

    getDescription() {
        return "Adds functionality to Mega Busters";
    }

    getGravity() {
        return this._gravity;
    }

    getInitialVelocity() {
        return this._initialVelocity;
    }

    getMaxVelocitySustainHeight() {
        return this._maxVelocitySustainHeight;
    }

    getTerminalVelocity() {
        return this._terminalVelocity;
    }

    setGravity(gravity) {
        this._gravity = gravity;
    }

    setInitialVelocity(initialVelocity) {
        this._initialVelocity = initialVelocity;
    }

    setMaxVelocitySustainHeight(maxVelocitySustainHeight) {
        this._maxVelocitySustainHeight = maxVelocitySustainHeight;
    }

    setTerminalVelocity(terminalVelocity) {
        this._terminalVelocity = terminalVelocity;
    }

    _isPressed() {
        if(deviceType == 'XR') {
            let rightGamepad = InputHandler.getXRGamepad("RIGHT");
            if(!rightGamepad) return false;
            return rightGamepad.axes[3] < -0.5;
        } else if(deviceType == 'MOBILE') {
            return this._mobileJumpPressed;
        } else {
            return InputHandler.isKeyCodePressed('Space');
        }
    }

    _handleJump(peer, message) {
        let jumpingDetails = {
            isPressed: () => { return true; },
            sustained: message.sustained,
            startHeight: message.startHeight,
            userObject: peer.controller.getObject(),
            velocity: this._initialVelocity,
        };
        jumpingDetails.userObject.position.setY(message.currentHeight);
        this._jumpingDetails[peer.controller.getId()] = jumpingDetails;
        let timeDelta = (Date.now() - message.startTime) / 1000;
        this._updateJump(timeDelta, jumpingDetails);
    }

    _checkJump() {
        if(this._myJumpingDetails) return;
        if(this._isPressed()) {
            let userObject = UserController.getObject();
            let startHeight = userObject.position.y;
            this._myJumpingDetails = {
                isPressed: () => { return this._isPressed(); },
                sustained: true,
                startHeight: startHeight,
                userObject: userObject,
                velocity: this._initialVelocity,
            };
            this._jumpingDetails['me'] = this._myJumpingDetails;
            this._publish(startHeight, startHeight, true);
        }
    }

    _publish(currentHeight, startHeight, sustained) {
        let message = {
            topic: this._jumpTopic,
            currentHeight: currentHeight,
            startHeight: startHeight,
            startTime: Date.now(),
            sustained: sustained,
        };
        PartyMessageHelper.queuePublish(JSON.stringify(message));
    }

    _sustainJump(timeDelta, jumpingDetails) {
        let userObject = jumpingDetails.userObject;
        let startHeight = jumpingDetails.startHeight;
        let userHeight = userObject.position.y;
        let newHeight = userHeight + this._initialVelocity * timeDelta;
        let totalHeightDiff = newHeight - startHeight;
        if(!jumpingDetails.isPressed()) {
            jumpingDetails.sustained = false;
            if(jumpingDetails == this._myJumpingDetails) {
                this._publish(userHeight, startHeight, false);
            }
            return timeDelta;
        } else if(totalHeightDiff > this._maxVelocitySustainHeight) {
            newHeight = startHeight + this._maxVelocitySustainHeight;
            let sustainedTime = (newHeight - userHeight)
                / this._initialVelocity;
            timeDelta -= sustainedTime;
            userObject.position.setY(newHeight);
            jumpingDetails.sustained = false;
            return timeDelta;
        } else {
            userObject.position.setY(newHeight);
            return;
        }
    }

    _fall(timeDelta, jumpingDetails) {
        let userObject = jumpingDetails.userObject;
        let startHeight = jumpingDetails.startHeight;
        let userHeight = userObject.position.y;
        let velocity = jumpingDetails.velocity;
        if(velocity == -this._terminalVelocity) {
            let newHeight = userObject.position.y + velocity * timeDelta;
            if(newHeight < startHeight) {
                newHeight = startHeight;
                jumpingDetails.finished = true;
            }
            userObject.position.setY(newHeight);
            return;
        }
        let newVelocity = -this._gravity * timeDelta + velocity;
        if(newVelocity < -this._terminalVelocity) {
            let accelerationTime = (-this._terminalVelocity - velocity)
                / -this._gravity;
            timeDelta -= accelerationTime;
            let newHeight = -0.5 * this._gravity * accelerationTime
                * accelerationTime + velocity * accelerationTime
                + userHeight;
            velocity = -this._terminalVelocity;
            jumpingDetails.velocity = velocity;
            newHeight += velocity * timeDelta;
            if(newHeight < startHeight) {
                newHeight = startHeight;
                jumpingDetails.finished = true;
            }
            userObject.position.setY(newHeight);
            return;
        }
        let newHeight = -0.5 * this._gravity * timeDelta * timeDelta + velocity
            * timeDelta + userHeight;
        jumpingDetails.velocity = newVelocity;
        if(newHeight < startHeight) {
            newHeight = startHeight;
            jumpingDetails.finished = true;
        }
        userObject.position.setY(newHeight);
    }

    _updateJump(timeDelta, jumpingDetails) {
        if(jumpingDetails.sustained) {
            timeDelta = this._sustainJump(timeDelta, jumpingDetails);
        }
        if(!timeDelta) return;
        this._fall(timeDelta, jumpingDetails);
    }

    addToScene() {
        super.addToScene();
        if(!isEditor())
            this._addSubscriptions();
    }

    removeFromScene() {
        super.removeFromScene();
        if(!isEditor() && deviceType == 'MOBILE')
            InputHandler.hideExtraControlsButton('jump-button-' + this._id);
    }

    update(timeDelta) {
        for(let id in this._jumpingDetails) {
            let jumpingDetails = this._jumpingDetails[id];
            this._updateJump(timeDelta, jumpingDetails);
            if(jumpingDetails.finished) {
                delete this._jumpingDetails[id];
                if(jumpingDetails == this._myJumpingDetails)
                    this._myJumpingDetails = null;
            }
        }
        this._checkJump();
    }

    static assetId = 'cb771151-3f59-4273-9a8e-ffa82aeece95';
    static assetName = 'Jump System';
}

ProjectHandler.registerAsset(JumpSystem);

if(EditorHelpers) {
    class JumpSystemHelper extends SystemHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "gravity", "name": "Gravity", "min": 0,
                "type": NumberInput },
            { "parameter": "initialVelocity", "name": "Initial Velocity",
                "min": 0, "type": NumberInput },
            { "parameter": "maxVelocitySustainHeight",
                "name": "Max Velocity Sustain Height", "min": 0,
                "type": NumberInput },
            { "parameter": "terminalVelocity", "name": "Terminal Velocity",
                "min": 0, "type": NumberInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(JumpSystemHelper,
        JumpSystem);
}
