/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

const { Assets, EditorHelpers, ProjectHandler, MenuInputs }=window.DigitalBacon;
const { AssetEntity, Component } = Assets;
const { ComponentHelper, EditorHelperFactory } = EditorHelpers;

export default class DeleteComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = DeleteComponent.assetId;
        super(params);
        this._topic = params['topic'] || '';
    }

    _getDefaultName() {
        return DeleteComponent.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['topic'] = this._topic;
        return params;
    }

    getTopic() {
        return this._topic;
    }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    setTopic(topic) {
        this._topic = topic;
    }

    static assetId = 'df6e1224-b416-493e-90f9-96f8be0d4b48';
    static assetName = 'Delete Component';
}

ProjectHandler.registerAsset(DeleteComponent);

if(EditorHelpers) {
    class DeleteComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "topic", "name": "Event",
                "type": MenuInputs.TextInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(DeleteComponentHelper,
        DeleteComponent);
}
