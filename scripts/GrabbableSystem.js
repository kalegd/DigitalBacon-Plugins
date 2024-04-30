/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

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
        this._peerOwned = {};
        this._notStealable = new Set();
        this._publishForNewPeers = {};
        this._onPartyJoined = {};
        this._addSubscriptions();
    }

    _getDefaultName() {
        return GrabbableSystem.assetName;
    }

    get description() { return 'Enables assets to be picked up by the user'; }

    _addSubscriptions() {
        if(isEditor()) return;
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let id = message.id;
            if(this._actions[id]) return;
            let instance = ProjectHandler.getSessionAsset(id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            if(!instance.originalParent)
                instance.originalParent = instance.parent;
            if(deviceType == 'XR') {
                this._createGripEventListeners(instance, component.stealable);
            } else {
                this._createPointerEventListeners(instance,component.stealable);
            }
            this._addEventListeners(instance);
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            this._removeEventListeners(instance);
            delete this._actions[message.id];
            this._notStealable.delete(message.id);
        });
    }

    _onPeerReady() {
        for(let key in this._publishForNewPeers) {
            this._publishForNewPeers[key]();
        }
    }

    _onPeerDisconnected(peer) {
        if(!this._peerOwned[peer.id]) return;
        for(let id of this._peerOwned[peer.id]) {
            if(id) this._handlePeerReleased(peer, { id: id });
        }
    }

    _onPartyStarted(isHost) {
        if(isHost) return;
        for(let key in this._onPartyJoined) {
            this._onPartyJoined[key]();
        }
    }

    _onPartyEnded() {
        for(let id in this._peerOwned) {
            for(let instanceId of this._peerOwned[id]) {
                let instance = ProjectHandler.getSessionAsset(instanceId);
                if(this._notStealable.has(instanceId))
                    this._addEventListeners(instance);
                this._peerOwned[id].delete(instanceId);
            }
        }
    }

    _createGripEventListeners(instance, stealable) {
        let object = instance.object;
        let downCallback = (message) => {
            instance.gripInteractable.capture(message.owner);
            let controller = ProjectHandler.getSessionAsset(message.owner.id);
            this._attach(instance, controller, stealable);
        };
        let clickCallback = (message) => {
            let controller = ProjectHandler.getSessionAsset(message.owner.id);
            this._release(instance, controller, stealable);
        };
        this._actions[instance.id] = [downCallback, clickCallback];
        if(!stealable) this._notStealable.add(instance.id);
    }

    _createPointerEventListeners(instance, stealable) {
        let avatar = UserController.avatar;
        let clickCallback = (message) => {
            if(instance.parent == avatar) {
                this._release(instance, avatar, stealable);
            } else {
                this._attach(instance, avatar, stealable);
            }
        };
        this._actions[instance.id] = [clickCallback];
        if(!stealable) this._notStealable.add(instance.id);
    }

    _addEventListeners(instance) {
        let actions = this._actions[instance.id];
        if(!actions) return;
        if(deviceType == 'XR') {
            instance.gripInteractable.addEventListener('down', actions[0]);
            instance.gripInteractable.addEventListener('click', actions[1]);
        } else {
            instance.pointerInteractable.addEventListener('click', actions[0],
                { maxDistance: 2 });
        }
    }

    _removeEventListeners(instance) {
        let actions = this._actions[instance.id];
        if(!actions) return;
        if(deviceType == 'XR') {
            instance.gripInteractable.removeEventListener('down', actions[0]);
            instance.gripInteractable.removeEventListener('click', actions[1]);
        } else {
            instance.pointerInteractable.removeEventListener('click',
                actions[0]);
        }
    }

    _attach(instance, controller, stealable) {
        instance.attachTo(controller);
        if(!stealable) {
            this._publish(OWNED_TOPIC, instance);
            this._publishForNewPeers[instance.id] = () => {
                if(instance.parent == controller)
                    this._publish(OWNED_TOPIC, instance);
            };
            this._onPartyJoined[instance.id] = () => {
                instance.attachTo(instance.originalParent);
            };
        }
    }

    _release(instance, controller, stealable) {
        if(instance.parent == controller) {
            instance.attachTo(instance.originalParent);
            if(!stealable) {
                this._publish(RELEASED_TOPIC, instance);
                delete this._onPartyJoined[instance.id];
                delete this._publishForNewPeers[instance.id];
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
            if(!this._peerOwned[peer.id]) this._peerOwned[peer.id] = new Set();
            this._peerOwned[peer.id].add(message.id);
            let instance = ProjectHandler.getSessionAsset(message.id);
            if(this._notStealable.has(message.id))
                this._removeEventListeners(instance);
        }
    }

    _handlePeerReleased(peer, message) {
        let instance = ProjectHandler.getSessionAsset(message.id);
        if(this._peerOwned[peer.id].has(message.id)) {
            if(this._notStealable.has(instance.id))
                this._addEventListeners(instance);
            this._peerOwned[peer.id].delete(message.id);
        }
    }

    _publish(topic, instance) {
        let message = {
            topic: topic,
            id: instance.id,
        };
        this._publishPeerMessage(message);
    }

    static assetId = '6329e98a-4311-4457-9198-48d75640f8cc';
    static assetName = 'Grabbable System';
}

ProjectHandler.registerAsset(GrabbableSystem);
