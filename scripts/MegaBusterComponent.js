/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

if(!window.DigitalBacon) {
    console.error('Missing global DigitalBacon reference');
    throw new Error('Missing global DigitalBacon reference');
}

const { Assets, ProjectHandler } = window.DigitalBacon;
const { AssetEntity, Component } = Assets;

export default class MegaBusterComponent extends Component {
    constructor(params = {}) {
        params['assetId'] = MegaBusterComponent.assetId;
        super(params);
    }

    _getDefaultName() {
        return MegaBusterComponent.assetName;
    }

    supports(asset) {
        return asset instanceof AssetEntity;
    }

    static assetId = '2271b355-d75c-4e58-818f-0a0d5f6e1413';
    static assetName = 'Mega Buster Component';
}

ProjectHandler.registerAsset(MegaBusterComponent);
