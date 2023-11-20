/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

const { Assets, ProjectHandler, PubSub, isEditor } = window.DigitalBacon;
const { System } = Assets;

const COMPONENT_ASSET_ID = '9339a01f-73de-490a-b81b-78ad3a155bb1';

export default class AddSystem extends System {
    constructor(params = {}) {
        params['assetId'] = AddSystem.assetId;
        super(params);
        this._topics = {};
        this._addSubscriptions();
    }

    _getDefaultName() {
        return AddSystem.assetName;
    }

    getDescription() {
        return 'Adds asset when event is published';
    }

    _addSubscriptions() {
        if(isEditor()) return;
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            this._registerAsset(instance, component.getTopic());
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let instance = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            this._unregisterAsset(instance, component.getTopic());
        });
    }

    _registerAsset(instance, topic) {
        if(!(topic in this._topics)) {
            this._topics[topic] = new Set();
            PubSub.subscribe(this._id, topic, () => this._addAssets(topic));
        }
        this._topics[topic].add(instance);
    }

    _unregisterAsset(instance, topic) {
        if(!(topic in this._topics)) return;
        this._topics[topic].delete(instance);
        if(this._topics[topic].size == 0) {
            PubSub.unsubscribe(this._id, topic);
        }
    }

    _addAssets(topic) {
        let assets = this._topics[topic];
        if(!assets) return;
        for(let asset of assets) {
            ProjectHandler.addAsset(asset);
        }
    }

    static assetId = 'adbdddb2-8492-4cd6-97db-5c864797a499';
    static assetName = 'Add System';
}

ProjectHandler.registerAsset(AddSystem);
