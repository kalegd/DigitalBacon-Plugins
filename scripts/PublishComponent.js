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

export default class PublishComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = PublishComponent.assetId;
        super(params);
        this._topic = params['topic'] || '';
    }

    _getDefaultName() {
        return PublishComponent.assetName;
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

    static assetId = '2a310a93-3f00-465a-862f-2bf8de118984';
    static assetName = 'Publish Component';
}

ProjectHandler.registerAsset(PublishComponent);

if(EditorHelpers) {
    class PublishComponentHelper extends ComponentHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            { "parameter": "topic", "name": "Event",
                "type": MenuInputs.TextInput },
        ];
    }

    EditorHelperFactory.registerEditorHelper(PublishComponentHelper,
        PublishComponent);
}
