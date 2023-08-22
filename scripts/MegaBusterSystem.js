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

const { Assets, InputHandler, PartyMessageHelper, ProjectHandler, UserController, getDeviceType, isEditor } = window.DigitalBacon;
const { System } = Assets;
const deviceType = getDeviceType();

const FIRE_AUDIO_QUANTITY = 3;
const MEGABUSTER_OWNED_TOPIC = 'MegaBusterSystem:MegabusterOwned';
const SHOT_FIRED_TOPIC = 'MegaBusterSystem:ShotFired';
const COMPONENT_ASSET_ID = '2271b355-d75c-4e58-818f-0a0d5f6e1413';
const SHOT_COMPONENT_ASSET_ID = '6e93b955-8f30-4ca8-85db-7fe24e055975';

export default class MegaBusterSystem extends System {
    constructor(params = {}) {
        params['assetId'] = MegaBusterSystem.assetId;
        super(params);
        this._actions = {};
        this._megabusters = {};
        this._shotAssets = {};
        this._shots = {};
        this._publishForNewPeers = {};
        this._onPartyJoined = {};
        this._myMegabusters = new Set();
    }

    _getDefaultName() {
        return MegaBusterSystem.assetName;
    }

    getDescription() {
        return "Adds functionality to Mega Busters";
    }

    _addSubscriptions() {
        if(isEditor()) return;
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            if(deviceType == 'XR') {
                this._addGripAction(instance, message.componentId);
            } else {
                this._addPointerAction(instance, message.componentId);
            }
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let action = this._actions[message.id];
            if(!action) return;
            if(deviceType == 'XR') {
                instance.removeGripAction(action.id);
            } else {
                instance.removePointerAction(action.id);
            }
            delete this._actions[message.id];
            this._clearMegabusters(message.id);
        });
        this._listenForComponentAttached(SHOT_COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            let type = component.getType();
            if(!(type in this._shotAssets)) this._shotAssets[type] = instance;
        });
        this._listenForComponentDetached(SHOT_COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            let type = component.getType();
            if(this._shotAssets[type] == instance)
                delete this._shotAssets[type];
        });
        PartyMessageHelper.registerBlockableHandler(MEGABUSTER_OWNED_TOPIC,
            (p, m) => { this._handleMegabusterOwned(p, m); });
        PartyMessageHelper.registerBlockableHandler(SHOT_FIRED_TOPIC,
            (p, m) => { this._handleShotFired(p, m); });
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

    _onPeerReady() {
        for(let key in this._publishForNewPeers) {
            this._publishForNewPeers[key]();
        }
    }

    _onPartyStarted(isHost) {
        if(isHost) return;
        for(let key in this._onPartyJoined) {
            this._onPartyJoined[key]();
        }
    }

    _onPartyEnded() {
        for(let id in this._megabusters) {
            let megabuster = this._megabusters[id];
            if(this._myMegabusters.has(megabuster)) return;
            this._deleteMegabuster(this._megabusters[id]);
        }
    }

    _addGripAction(instance, componentId) {
        let object = instance.getObject();
        let action = instance.addGripAction((ownerId) => {
            let controller = ProjectHandler.getSessionAsset(ownerId);
            let megabuster = this._createMegabuster(instance, componentId,
                controller);
            if(!megabuster) return;
            if(controller.constructor.name == 'XRController') {
                let handedness = controller.getHandedness();
                let gamepad = InputHandler.getXRGamepad(handedness);
                if(gamepad && gamepad.hapticActuators)
                    megabuster.hapticActuators = gamepad.hapticActuators;
            }
            megabuster.isTriggerPressed = () => {
                return controller.isButtonPressed(0);
            };
            controller.addDeleteCallback(this._id, () => {
                if(megabuster.getObject().parent) {
                    controller.hasMegaBuster = false;
                    this._deleteMegabuster(megabuster);
                }
            });
        });
        this._actions[instance.getId()] = action;
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

    _createMegabuster(instance, componentId, controller) {
        if(controller.hasMegaBuster) return;
        let megabuster = instance.clone();
        this._addAudioSources(megabuster);
        megabuster.sourceId = instance.getId();
        megabuster.removeComponent(componentId);
        if(controller.constructor.name == 'Avatar') {
            megabuster.addTo(controller);
            megabuster.setPosition([-0.25, -0.2, -0.2]);
            megabuster.setRotation([0, 0, 0]);
        } else {
            controller.addFromTargetRay(megabuster, [0, 0, 0], [0, 0, 0]);
        }
        controller.hasMegaBuster = true;
        this._megabusters[megabuster.getId()] = megabuster;
        this._myMegabusters.add(megabuster);
        //Publish to users that we own this instance
        this._publish(MEGABUSTER_OWNED_TOPIC, megabuster, controller);
        //publish to new users when they join that we own this instance
        this._publishForNewPeers[megabuster.getId()] = () => {
            this._publish(MEGABUSTER_OWNED_TOPIC, megabuster, controller);
        };
        this._onPartyJoined[megabuster.getId()] = () =>{
            controller.hasMegaBuster = false;
            this._deleteMegabuster(megabuster);
        };
        return megabuster;
    }

    _deleteMegabuster(megabuster) {
        if(megabuster.fireAudioSources) {
            for(let audio of megabuster.fireAudioSources) {
                ProjectHandler.deleteAsset(audio, true, true);
            }
        }
        ProjectHandler.deleteAsset(megabuster, true, true);
        let id = megabuster.getId();
        this._myMegabusters.delete(megabuster);
        delete this._megabusters[id];
        delete this._publishForNewPeers[id];
        delete this._onPartyJoined[id];
    }

    _addAudioSources(megabuster) {
        let newAudioIds = [];
        let fireAudio = this._shotAssets['FIRE_AUDIO'];
        if(!megabuster.fireAudioSources && fireAudio) {
            megabuster.fireAudioSources = [];
            for(let i = 0; i < FIRE_AUDIO_QUANTITY; i++) {
                let clonedAudio = fireAudio.clone();
                newAudioIds.push(clonedAudio.getId());
                megabuster.fireAudioSources.push(clonedAudio);
                megabuster.add(clonedAudio);
            }
            megabuster.fireAudioIndex = 0;
        }
    }

    _handleMegabusterOwned(peer, message) {
        let instance = ProjectHandler.getSessionAsset(message.id);
        let controller = ProjectHandler.getSessionAsset(message.controllerId);
        this._megabusters[message.id] = instance;
        controller.addDeleteCallback(this._id, () => {
            if(instance.getObject().parent) this._deleteMegabuster(instance);
        });
    }

    _handleShotFired(peer, message) {
        let shot = ProjectHandler.getSessionAsset(message.id);
        shot.firedAt = message.firedAt;
        shot.setPosition(message.initialPosition);
        shot.velocity = new THREE.Vector3();
        shot.velocity.fromArray(message.velocity);
        let timeDelta = (Date.now() - shot.firedAt) / 1000;
        shot.getObject().position.addScaledVector(shot.velocity, timeDelta);
        this._shots[message.id] = shot;
    }

    _publish(topic, instance, controller) {
        let message = {
            topic: topic,
            id: instance.getId(),
            controllerId: controller.getId(),
        };
        PartyMessageHelper.queuePublish(JSON.stringify(message));
    }

    _checkShotFired() {
        for(let megabuster of this._myMegabusters) {
            if(!megabuster.triggerPressedAt) {
                if(megabuster.isTriggerPressed()) {
                    megabuster.triggerPressedAt = Date.now();
                }
            } else if(megabuster.isTriggerPressed()) {
                let hapticActuators = megabuster.hapticActuators;
                if(!hapticActuators || hapticActuators.length == 0) return;
                let chargeTime = Date.now() - megabuster.triggerPressedAt;
                if(chargeTime >= 1500) {
                    hapticActuators[0].pulse(.2, 100);
                } else if(chargeTime >= 500) {
                    hapticActuators[0].pulse(.15, 100);
                } else {
                    hapticActuators[0].pulse(.1, 100);
                }
                //TODO: Charge audio
            } else {
                let firedAt = Date.now();
                let chargeTime = firedAt - megabuster.triggerPressedAt;
                megabuster.triggerPressedAt = 0;
                this._shoot(megabuster, firedAt, chargeTime);
                let hapticActuators = megabuster.hapticActuators;
                if(!hapticActuators || hapticActuators.length == 0) return;
                hapticActuators[0].pulse(0, 10);
            }
        }
    }

    _shoot(megabuster, firedAt, chargeTime) {
        let sourceAsset;
        if(chargeTime < 500) {
            sourceAsset = this._shotAssets['NORMAL'];
        } else if(chargeTime < 1500) {
            sourceAsset = this._shotAssets['HALF_CHARGED'];
        } else {
            sourceAsset = this._shotAssets['FULLY_CHARGED'];
        }
        if(!sourceAsset) return;
        let shot = sourceAsset.clone();
        let position = megabuster.getWorldPosition();
        let positionArray = position.toArray();
        let velocity = new THREE.Vector3();
        shot.setPosition(positionArray);
        shot.firedAt = firedAt;
        megabuster.getObject().getWorldDirection(velocity);
        velocity.negate().normalize().multiplyScalar(15);
        shot.velocity = velocity;
        position.add(velocity);
        shot.getObject().lookAt(position);
        this._shots[shot.getId()] = shot;
        if(megabuster.fireAudioSources) {
            let audio = megabuster.fireAudioSources[megabuster.fireAudioIndex];
            megabuster.fireAudioIndex = (megabuster.fireAudioIndex + 1 )
                % FIRE_AUDIO_QUANTITY;
            audio.play(0);
        }
        let message = {
            topic: SHOT_FIRED_TOPIC,
            id: shot.getId(),
            firedAt: firedAt,
            chargeTime: chargeTime,
            initialPosition: positionArray,
            velocity: velocity.toArray(),
        };
        PartyMessageHelper.queuePublish(JSON.stringify(message));
    }

    addToScene() {
        super.addToScene();
        this._addSubscriptions();
    }

    removeFromScene() {
        super.removeFromScene();
        this._clearMegabusters();
        for(let id in this._actions) {
            let instance = ProjectHandler.getSessionAsset(id);
            let action = this._actions[id];
            if(deviceType == 'XR') {
                instance.removeGripAction(action.id);
            } else {
                instance.removePointerAction(action.id);
            }
        }
    }

    update(timeDelta) {
        for(let shotId in this._shots) {
            let shot = this._shots[shotId];
            shot.getObject().position.addScaledVector(shot.velocity, timeDelta);
            if(Date.now() - shot.firedAt > 20000) {
                delete this._shots[shotId];
                ProjectHandler.deleteAsset(shot, true, true);
            }
        }
        this._checkShotFired();
    }

    static assetId = '9484b130-eca7-436b-8c57-4547ca3c9ca1';
    static assetName = 'Mega Buster System';
}

ProjectHandler.registerAsset(MegaBusterSystem);
