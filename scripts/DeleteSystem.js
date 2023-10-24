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

const PUBLISH_TOPIC = 'DeleteSystem:published';
const COMPONENT_ASSET_ID = 'df6e1224-b416-493e-90f9-96f8be0d4b48';

export default class DeleteSystem extends System {
    constructor(params = {}) {
        params['assetId'] = DeleteSystem.assetId;
        super(params);
        this._topics = {};
        this._addSubscriptions();
    }

    _getDefaultName() {
        return DeleteSystem.assetName;
    }

    getDescription() {
        return 'Deletes asset when event is published';
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
            PubSub.subscribe(this._id, topic, () => this._deleteAssets(topic));
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

    _deleteAssets(topic) {
        let assets = this._topics[topic];
        if(!assets) return;
        for(let asset of assets) {
            ProjectHandler.deleteAsset(asset);
        }
    }

    static assetId = 'ffe54646-8d33-4579-b369-6527df447fe3';
    static assetName = 'Delete System';
}

ProjectHandler.registerAsset(DeleteSystem);
