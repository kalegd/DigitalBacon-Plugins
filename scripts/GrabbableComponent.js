/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, EditorHelpers, ProjectHandler } = window.DigitalBacon;
const { AssetEntity, Component } = Assets;
const { ComponentHelper, EditorHelperFactory } = EditorHelpers;

export default class GrabbableComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = GrabbableComponent.assetId;
        super(params);
        this._stealable = params['stealable'] == true;
    }

    _getDefaultName() {
        return GrabbableComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['stealable'] = this._stealable;
        return params;
    }

    get stealable() { return this._stealable; }

    set stealable(stealable) { this._stealable = stealable; }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    static assetId = 'd9891de1-914d-4448-9e66-8867211b5dc8';
    static assetName = 'Grabbable';
}

ProjectHandler.registerAsset(GrabbableComponent);

if(EditorHelpers) {
    class GrabbableComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "stealable", "name": "Stealable",
                "type": ComponentHelper.FieldTypes.CheckboxField },
        ];
    }

    EditorHelperFactory.registerEditorHelper(GrabbableComponentHelper,
        GrabbableComponent);
}
