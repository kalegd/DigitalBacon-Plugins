/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, ProjectHandler } = window.DigitalBacon;
const { System } = Assets;

const COMPONENT_ASSET_ID = 'ab72b23e-47c6-4406-b184-9d9a175394b0';

export default class FrustumCulledSystem extends System {
    constructor(params = {}) {
        params['assetId'] = FrustumCulledSystem.assetId;
        super(params);
        this._componentDetails = {};
        this._addSubscriptions();
    }

    _getDefaultName() {
        return FrustumCulledSystem.assetName;
    }

    get description() { return "Sets entities' frustumCulled property"; }

    _addSubscriptions() {
        this._listenForComponentAttached(COMPONENT_ASSET_ID, (message) => {
            let asset = ProjectHandler.getSessionAsset(message.id);
            let component = ProjectHandler.getSessionAsset(message.componentId);
            if(!this._componentDetails[message.componentId]) {
                this._componentDetails[message.componentId] = {
                    component: component,
                    assets: {},
                };
            }
            let assets = this._componentDetails[message.componentId].assets;
            assets[message.id] = asset;
            this._setFrustumCulled(component.frustumCulled, asset);
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let componentMap = this._componentDetails[message.componentId];
            if(!componentMap) return;
            let assets = componentMap.assets;
            if(assets[message.id]) {
                let asset = assets[message.id];
                this._resetFrustumCulled(asset);
                delete assets[message.id];
            }
            if(Object.keys(assets).length == 0)
                delete this._componentDetails[message.componentId];
        });
        this._listenForComponentUpdated(COMPONENT_ASSET_ID, (message) => {
            let component = message.asset;
            let componentMap = this._componentDetails[component.id];
            if(!componentMap) return;
            let assets = componentMap.assets;
            let frustumCulled = componentMap.component.frustumCulled;
            for(let assetId in assets) {
                this._setFrustumCulled(frustumCulled, assets[assetId]);
            }
        });
    }

    _setFrustumCulled(frustumCulled, asset) {
        asset.object.traverse((object) => {
            if(!('oldFrustumCulled' in object.userData))
                object.userData['oldFrustumCulled'] = object.frustumCulled;
            object.frustumCulled = frustumCulled;
        });
    }

    _resetFrustumCulled(asset) {
        asset.object.traverse((object) => {
            if('oldFrustumCulled' in object.userData) {
                object.frustumCulled = object.userData['oldFrustumCulled'];
                delete object.userData['oldFrustumCulled'];
            } else {//assume true
                object.frustumCulled = true;
            }
        });
    }

    static assetId = '860c821c-bc3a-40e3-a1c7-1f28d49ef6e9';
    static assetName = 'Frustum Culled System';
}

ProjectHandler.registerAsset(FrustumCulledSystem);
