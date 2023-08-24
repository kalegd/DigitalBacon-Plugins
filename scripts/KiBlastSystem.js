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

const { Assets, InputHandler, PartyMessageHelper, ProjectHandler, Scene, UserController, getDeviceType, isEditor } = window.DigitalBacon;
const { System } = Assets;
const deviceType = getDeviceType();

const AUDIO_QUANTITY = 3;
const BLAST_FIRED_TOPIC = 'KiBlastSystem:BlastFired';
const COMPONENT_ASSET_ID = '38829fa8-c900-41e1-987c-69f3622be707';

export default class MegaBusterSystem extends System {
    constructor(params = {}) {
        params['assetId'] = MegaBusterSystem.assetId;
        super(params);
        this._actions = {};
        this._megabusters = {};
        this._blastAssets = {};
        this._blasts = {};
        this._publishForNewPeers = {};
        this._onPartyJoined = {};
        this._audioAssets = [];
        this._audioIndex = 0;
    }

    _getDefaultName() {
        return MegaBusterSystem.assetName;
    }

    getDescription() {
        return "Adds ability to throw Ki blasts";
    }

    _addSubscriptions() {
        if(isEditor()) return;
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            let type = component.getType();
            if(!(type in this._blastAssets)) this._blastAssets[type] = instance;
            if(type == 'AUDIO') this._createAudio();
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            let type = component.getType();
            if(this._blastAssets[type] == instance)
                delete this._blastAssets[type];
        });
        PartyMessageHelper.registerBlockableHandler(BLAST_FIRED_TOPIC,
            (p, m) => { this._handleBlastFired(p, m); });
    }

    _clearMegabusters(sourceId) {
        for(let id in this._megabusters) {
            let megabuster = this._megabusters[id];
            if(sourceId && sourceId != megabuster.sourceId) continue;
            this._deleteMegabuster(this._megabusters[id]);
        }
        if(deviceType != 'XR') {
            if(this._myMegabusters.size == 0)
                UserController.getAvatar().hasMegaBuster = false;
        }
    }

    _createAudio() {
        if(this._audioAssets.length > 0) return;
        let blastAudio = this._blastAssets['AUDIO'];
        if(!blastAudio) return;
        for(let i = 0; i < AUDIO_QUANTITY; i++) {
            let clonedAudio = blastAudio.clone();
            this._audioAssets.push(clonedAudio);
        }
        this._audioIndex = 0;
    }

    _onUserReady() {
        this._createAudio();
    }

    _onPartyStarted(isHost) {
        if(isHost) return;
        for(let i = this._audioAssets.length - 1; i >= 0; i--) {
            ProjectHandler.deleteAsset(this._audioAssets[i]);
            this._audioAssets.pop();
        }
    }

    _onPartyEnded() {
        for(let id in this._megabusters) {
            let megabuster = this._megabusters[id];
            if(this._myMegabusters.has(megabuster)) return;
            this._deleteMegabuster(this._megabusters[id]);
        }
    }

    _addPointerAction(instance, componentId) {
        let action = instance.addPointerAction(() => {
            let avatar = UserController.getAvatar();
            let megabuster = this._createMegabuster(instance, componentId,
                avatar);
            if(!megabuster) return;
            megabuster.isTriggerPressed = () => {
                if(deviceType == 'POINTER') {
                    return InputHandler.isPointerPressed();
                } else {
                    return this._mobileFirePressed;
                }
            }
            if(deviceType == 'MOBILE' && !this._alreadyCreatedFireButton) {
                this._alreadyCreatedFireButton = true;
                let fireButton = InputHandler.addExtraControlsButton(
                    'fire-button', 'FIRE');
                fireButton.addEventListener('touchstart',
                    () => { this._mobileFirePressed = true; });
                fireButton.addEventListener('touchend',
                    () => { this._mobileFirePressed = false; });
            }
        }, null, 2);
        this._actions[instance.getId()] = action;
    }

    _handleMegabusterOwned(peer, message) {
        let instance = ProjectHandler.getSessionAsset(message.id);
        let controller = ProjectHandler.getSessionAsset(message.controllerId);
        this._megabusters[message.id] = instance;
        controller.addDeleteCallback(this._id, () => {
            if(instance.getObject().parent) this._deleteMegabuster(instance);
        });
    }

    _handleBlastFired(peer, message) {
        let blast = ProjectHandler.getSessionAsset(message.id);
        blast.firedAt = message.firedAt;
        blast.setPosition(message.initialPosition);
        blast.velocity = new THREE.Vector3();
        blast.velocity.fromArray(message.velocity);
        let timeDelta = (Date.now() - blast.firedAt) / 1000;
        blast.getObject().position.addScaledVector(blast.velocity, timeDelta);
        this._blasts[message.id] = blast;
    }

    _updateState(controller) {
        controller.state.position = controller.getObject().position.toArray();
        controller.state.time = Date.now();
    }

    _checkBlastFired() {
        for(let controller of UserController.getXRDevices()) {
            if(!controller.getHandedness || !controller.isButtonPressed)
                continue;
            let buttonPressed = controller.isButtonPressed(1);
            if(!controller.state)
                controller.state = { isPressed: buttonPressed };
            if(buttonPressed != controller.state.isPressed) {
                controller.state.isPressed = buttonPressed;
                if(buttonPressed) {
                    if(!this._blastAssets['BLAST']) continue;
                    let blast = this._blastAssets['BLAST'].clone();
                    blast.attachTo(controller);
                    if(controller.getPalmDirection) {
                        blast.setPosition((controller.getHandedness() == 'LEFT')
                            ? [0.2, 0, 0]
                            : [-0.2, 0, 0]);
                    } else {
                        blast.setPosition([0, 0, -0.2]);
                    }
                    controller.blast = blast;
                } else {
                    if(!controller.blast) continue;
                    this._shoot(controller);
                    delete controller.blast;
                }
            }
            this._updateState(controller);
        }
    }

    _shoot(controller) {
        let blast = controller.blast;
        controller.blast = null;
        Scene.attach(blast);
        let oldPosition = controller.state.position;
        let oldTime = controller.state.time;
        let position = controller.getObject().position.toArray();
        blast.firedAt = Date.now();
        let timeDelta = (blast.firedAt - oldTime) / 1000;
        let velocity = position.map((n, index) => {
            return (n - oldPosition[index]) / timeDelta;
        });
        let velocityTotal = Math.hypot(...velocity);
        blast.velocity = new THREE.Vector3();
        if(velocityTotal > 10) {
            blast.velocity.fromArray(velocity);
            blast.velocity.setLength(velocityTotal * 2);
        } else {
            blast.velocity.copy((controller.getPalmDirection)
                ? controller.getPalmDirection()
                : controller.getTargetRayDirection());
            blast.velocity.setLength(20);
        }
        this._blasts[blast.getId()] = blast;
        this._playAudioFor(blast);
        //TODO: Audio
        this._publish(blast);
    }

    _playAudioFor(blast) {
        if(this._audioAssets.length == 0) return;
        let audio = this._audioAssets[this._audioIndex];
        this._audioIndex = (this._audioIndex + 1) % AUDIO_QUANTITY;
        blast.getWorldPosition(audio.getObject().position);
        audio.play(0);
    }

    _publish(blast) {
        let message = {
            topic: BLAST_FIRED_TOPIC,
            id: blast.getId(),
            firedAt: blast.firedAt,
            initialPosition: blast.getPosition(),
            velocity: blast.velocity.toArray(),
        };
        PartyMessageHelper.queuePublish(JSON.stringify(message));
    }

    addToScene() {
        super.addToScene();
        this._addSubscriptions();
    }

    update(timeDelta) {
        for(let blastId in this._blasts) {
            let blast = this._blasts[blastId];
            blast.getObject().position.addScaledVector(blast.velocity, timeDelta);
            if(Date.now() - blast.firedAt > 20000) {
                delete this._blasts[blastId];
                ProjectHandler.deleteAsset(blast, true, true);
            }
        }
        this._checkBlastFired();
    }

    static assetId = '15d5e8c5-ffe4-4058-9a83-663601a85778';
    static assetName = 'Ki Blast System';
}

ProjectHandler.registerAsset(MegaBusterSystem);
