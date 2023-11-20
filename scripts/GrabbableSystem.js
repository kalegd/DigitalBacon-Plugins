/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

const { Assets, ProjectHandler, UserController, getDeviceType, isEditor } = window.DigitalBacon;
const { System } = Assets;
const deviceType = getDeviceType();

const AVATAR = 'AVATAR';
const OWNED_TOPIC = 'OWNED';
const RELEASED_TOPIC = 'RELEASED';
const COMPONENT_ASSET_ID = 'd9891de1-914d-4448-9e66-8867211b5dc8';

export default class GrabbableSystem extends System {
    constructor(params = {}) {
        params['assetId'] = GrabbableSystem.assetId;
        super(params);
        this._actions = {};
        this._notStealable = {};
        this._peerOwned = {};
        this._publishForNewPeers = {};
        this._onPartyJoined = {};
        this._addSubscriptions();
    }

    _getDefaultName() {
        return GrabbableSystem.assetName;
    }

    getDescription() {
        return 'Enables assets to be picked up by the user';
    }

    _addSubscriptions() {
        if(isEditor()) return;
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let id = message.id;
            if(this._actions[id] || this._notStealable[id]) return;
            let instance = ProjectHandler.getSessionAsset(id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            if(!instance.originalParent)
                instance.originalParent = instance.parent;
            if(deviceType == 'XR') {
                this._addGripAction(instance, component.getStealable());
            } else {
                this._addPointerAction(instance, component.getStealable());
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
        });
    }

    _onPeerReady() {
        for(let key in this._publishForNewPeers) {
            this._publishForNewPeers[key]();
        }
    }

    _onPeerDisconnected(peer) {
        let id = this._peerOwned[peer.id];
        if(id) {
            this._handlePeerReleased(peer, { id: id });
        }
    }

    _onPartyStarted(isHost) {
        if(isHost) return;
        for(let key in this._onPartyJoined) {
            this._onPartyJoined[key]();
        }
    }

    _onPartyEnded() {
        for(let id in this._notStealable) {
            let instance = ProjectHandler.getSessionAsset(id);
            let action = this._notStealable[id];
            this._actions[id] = action;
            if(deviceType == 'XR') {
                instance.addGripAction(action);
            } else {
                instance.addPointerAction(action);
            }
            delete this._notStealable[id];
        }
    }

    _addGripAction(instance, stealable) {
        let object = instance.getObject();
        let action = instance.addGripAction((ownerId) => {
                let controller = ProjectHandler.getSessionAsset(ownerId);
                this._attach(instance, controller, stealable);
            }, (ownerId) => {
                let controller = ProjectHandler.getSessionAsset(ownerId);
                this._release(instance, controller, stealable);
            }
        );
        this._actions[instance.getId()] = action;
    }

    _addPointerAction(instance, stealable) {
        let avatar = UserController.getAvatar();
        let action = instance.addPointerAction(() => {
            if(instance.parent == avatar) {
                this._release(instance, avatar, stealable);
            } else {
                this._attach(instance, avatar, stealable);
            }
        }, null, 2);
        this._actions[instance.getId()] = action;
    }

    _attach(instance, controller, stealable) {
        instance.attachTo(controller);
        if(!stealable) {
            this._publish(OWNED_TOPIC, instance);
            this._publishForNewPeers[instance.getId()] = () => {
                if(instance.parent == controller)
                    this._publish(OWNED_TOPIC, instance);
            };
            this._onPartyJoined[instance.getId()] = () => {
                instance.attachTo(instance.originalParent);
            };
        }
    }

    _release(instance, controller, stealable) {
        if(instance.parent == controller) {
            instance.attachTo(instance.originalParent);
            if(!stealable) {
                this._publish(RELEASED_TOPIC, instance);
                delete this._onPartyJoined[instance.getId()];
                delete this._publishForNewPeers[instance.getId()];
            }
        }
    }

    _onPeerMessage(peer, message) {
        if(message.topic == OWNED_TOPIC) {
            this._handlePeerOwned(peer, message);
        } else if(message.topic == RELEASED_TOPIC) {
            this._handlePeerReleased(peer, message);
        } else {
            console.error('Error: Unexpected peer message topic received in GrabbableSystem');
        }
    }

    _handlePeerOwned(peer, message) {
        if(this._actions[message.id]) {
            this._peerOwned[peer.id] = message.id;
            let instance = ProjectHandler.getSessionAsset(message.id);
            let action = this._actions[message.id];
            this._notStealable[message.id] = action;
            if(deviceType == 'XR') {
                instance.removeGripAction(action.id);
            } else {
                instance.removePointerAction(action.id);
            }
            delete this._actions[message.id];
        }
    }

    _handlePeerReleased(peer, message) {
        let instance = ProjectHandler.getSessionAsset(message.id);
        if(this._notStealable[message.id]) {
            delete this._peerOwned[peer.id];
            let action = this._notStealable[message.id];
            this._actions[message.id] = action;
            if(deviceType == 'XR') {
                instance.addGripAction(action);
            } else {
                instance.addPointerAction(action);
            }
            delete this._notStealable[message.id];
        }
    }

    _publish(topic, instance) {
        let message = {
            topic: topic,
            id: instance.getId(),
        };
        this._publishPeerMessage(message);
    }

    static assetId = '6329e98a-4311-4457-9198-48d75640f8cc';
    static assetName = 'Grabbable System';
}

ProjectHandler.registerAsset(GrabbableSystem);
