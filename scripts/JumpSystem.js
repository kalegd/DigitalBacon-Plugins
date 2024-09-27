/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, DigitalBaconUI, EditorHelpers, ProjectHandler, PubSub, SettingsHandler, THREE, UserController, getDeviceType, isEditor, utils } = window.DigitalBacon;
const { System } = Assets;
const { SystemHelper, EditorHelperFactory } = EditorHelpers;
const { NumberField } = SystemHelper.FieldTypes;
const { InputHandler } = DigitalBaconUI;
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
        this._jumpingDetails = [];
        if(isEditor()) this.update = null;
    }

    _addSubscriptions() {
        SettingsHandler.setUserSetting('Enable Flying', false);
        PubSub.subscribe(this._id, 'SETTINGS_UPDATED', (message) => {
            SettingsHandler.setUserSetting('Enable Flying', false, true);
        });
        this._subscriptionTopics.push('SETTINGS_UPDATED');
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

    get description() { return "Adds functionality to Mega Busters"; }
    get gravity() { return this._gravity; }
    get initialVelocity() { return this._initialVelocity; }
    get maxVelocitySustainHeight() { return this._maxVelocitySustainHeight; }
    get terminalVelocity() { return this._terminalVelocity; }

    set gravity(gravity) { this._gravity = gravity; }

    set initialVelocity(initialVelocity) {
        this._initialVelocity = initialVelocity;
    }

    set maxVelocitySustainHeight(maxVelocitySustainHeight) {
        this._maxVelocitySustainHeight = maxVelocitySustainHeight;
    }

    set terminalVelocity(terminalVelocity) {
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

    _onPeerMessage(peer, message) {
        let jumpingDetails = {
            isPressed: () => { return true; },
            sustained: message.sustained,
            startHeight: message.startHeight,
            userObject: peer.controller.object,
            velocity: this._initialVelocity,
        };
        jumpingDetails.userObject.position.setY(message.currentHeight);
        this._jumpingDetails[peer.controller.id] = jumpingDetails;
        let timeDelta = (Date.now() - message.startTime) / 1000;
        this._updateJump(timeDelta, jumpingDetails);
    }

    _checkJump() {
        if(this._myJumpingDetails) return;
        if(this._isPressed()) {
            let userObject = UserController.object;
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
            currentHeight: currentHeight,
            startHeight: startHeight,
            startTime: Date.now(),
            sustained: sustained,
        };
        this._publishPeerMessage(message);
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

    onAddToProject() {
        super.onAddToProject();
        if(!isEditor()) this._addSubscriptions();
    }

    onRemoveFromProject() {
        super.onRemoveFromProject();
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
                "type": NumberField },
            { "parameter": "initialVelocity", "name": "Initial Velocity",
                "min": 0, "type": NumberField },
            { "parameter": "maxVelocitySustainHeight",
                "name": "Max Velocity Sustain Height", "min": 0,
                "type": NumberField },
            { "parameter": "terminalVelocity", "name": "Terminal Velocity",
                "min": 0, "type": NumberField },
        ];
    }

    EditorHelperFactory.registerEditorHelper(JumpSystemHelper,
        JumpSystem);
}
