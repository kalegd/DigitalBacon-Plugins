/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, ProjectHandler } = window.DigitalBacon;
const { System } = Assets;

const COMPONENT_ASSET_ID = 'f4e5b6a5-3712-4f0b-883a-197c26debf24';

export default class RenderOrderSystem extends System {
    constructor(params = {}) {
        params['assetId'] = RenderOrderSystem.assetId;
        super(params);
        this._componentDetails = {};
        this._addSubscriptions();
    }

    _getDefaultName() {
        return RenderOrderSystem.assetName;
    }

    get description() { return "Sets entities' renderOrder property"; }

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
            this._setRenderOrder(component.renderOrder, asset);
        });
        this._listenForComponentDetached(COMPONENT_ASSET_ID, (message) => {
            let componentMap = this._componentDetails[message.componentId];
            if(!componentMap) return;
            let assets = componentMap.assets;
            if(assets[message.id]) {
                let asset = assets[message.id];
                this._resetRenderOrder(asset);
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
            let renderOrder = componentMap.component.renderOrder;
            for(let assetId in assets) {
                this._setRenderOrder(renderOrder, assets[assetId]);
            }
        });
    }

    _setRenderOrder(renderOrder, asset) {
        asset.object.traverse((object) => {
            if(!('oldRenderOrder' in object.userData))
                object.userData['oldRenderOrder'] = object.renderOrder;
            object.renderOrder = renderOrder;
        });
    }

    _resetRenderOrder(asset) {
        asset.object.traverse((object) => {
            if('oldRenderOrder' in object.userData) {
                object.renderOrder = object.userData['oldRenderOrder'];
                delete object.userData['oldRenderOrder'];
            } else {//assume 0
                object.renderOrder = 0;
            }
        });
    }

    static assetId = 'd594839a-3d31-4ba4-aac0-a0dbc3ef7999';
    static assetName = 'Render Order System';
}

ProjectHandler.registerAsset(RenderOrderSystem);
