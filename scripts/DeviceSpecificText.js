/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, DigitalBaconUI, EditorHelpers, ProjectHandler, THREE, getCamera, getDeviceType, utils } = window.DigitalBacon;
const { TextAssetHelper, EditorHelperFactory } = EditorHelpers;
const { ColorField, EnumField, NumberField, TextField } = TextAssetHelper.FieldTypes;
const { numberOr } = utils;
const deviceType = getDeviceType();

export default class DeviceSpecificText extends Assets.TextAsset {
    constructor(params = {}) {
        params['assetId'] = DeviceSpecificText.assetId;
        super(params);
        this._backgroundColor = new THREE.Color(
            numberOr(params['backgroundColor'],  0x000000));
        this._backgroundOpacity = numberOr(params['backgroundOpacity'], 1);
        this._borderRadius = numberOr(params['borderRadius'], 0.1);
        this._deviceType = deviceType;
        this._justifyContent = params['justifyContent'] || 'center';
        this._padding = numberOr(params['padding'], 0);
        this._pointerText = params['pointerText'] || 'Hi Computer';
        this._touchScreenText = params['touchScreenText'] || 'Hi Touch Screen';
        this._xrText = params['xrText'] || 'Hi XR';
        this._height = numberOr(params['height'], 1);
        this._width = numberOr(params['width'], 1);
        this._createMesh();
    }

    _createMesh() {
        this._block = new DigitalBaconUI.Body({
            borderRadius: this._borderRadius,
            height: this._height,
            justifyContent: this._justifyContent,
            materialColor: this._backgroundColor,
            opacity: this._backgroundOpacity,
            padding: this._padding,
            width: this._width,
        });
        this._textComponent = new DigitalBaconUI.Text(this._getDeviceText(), {
            color: this._fontColor,
            fontSize: this._fontSize,
            maxWidth: this._width,
            textAlign: this._textAlign,
            width: '100%',
        });
        this._block.add(this._textComponent);
        this._object.add(this._block);
        this._configureMesh();
    }

    _configureMesh() {
        if(this._block)
            this._block._updateMaterialOffset(this._renderOrder - 1);
    }

    _getDefaultName() {
        return DeviceSpecificText.assetName;
    }

    _getDeviceText() {
        if(this._deviceType == 'POINTER') {
            return this._pointerText;
        } else if(this._deviceType == 'TOUCH_SCREEN') {
            return this._touchScreenText;
        } else {
            return this._xrText;
        }
    }

    exportParams() {
        let params = super.exportParams();
        params['backgroundColor'] = this._backgroundColor.getHex();
        params['backgroundOpacity'] = this._backgroundOpacity;
        params['borderRadius'] = this._borderRadius;
        params['height'] = this._height;
        params['justifyContent'] = this._justifyContent;
        params['padding'] = this._padding;
        params['pointerText'] = this._pointerText;
        params['touchScreenText'] = this._touchScreenText;
        params['xrText'] = this._xrText;
        params['width'] = this._width;
        return params;
    }

    get backgroundColor() { return this._backgroundColor.getHex(); }
    get backgroundOpacity() { return this._backgroundOpacity; }
    get borderRadius() { return this._borderRadius; }
    get justifyContent() { return this._justifyContent; }
    get padding() { return this._padding; }
    get touchScreenText() { return this._touchScreenText; }
    get pointerText() { return this._pointerText; }
    get xrText() { return this._xrText; }
    get height() { return this._height; }
    get width() { return this._width; }

    set backgroundColor(backgroundColor) {
        this._backgroundColor.set(backgroundColor);
        this._block.materialColor = this._backgroundColor;
    }

    set backgroundOpacity(backgroundOpacity) {
        this._backgroundOpacity = backgroundOpacity;
        this._block.opacity = backgroundOpacity;
    }

    set borderRadius(borderRadius) {
        this._borderRadius = borderRadius;
        this._block.borderRadius = borderRadius;
    }

    set justifyContent(justifyContent) {
        this._justifyContent = justifyContent;
        this._block.justifyContent = justifyContent;
    }

    set padding(padding) {
        this._padding = padding;
        this._block.padding = padding;
    }

    set touchScreenText(text) {
        this._touchScreenText = text;
        if(this._deviceType == 'TOUCH_SCREEN') this._textComponent.text = text;
    }

    set pointerText(text) {
        this._pointerText = text;
        if(this._deviceType == 'POINTER') this._textComponent.text = text;
    }

    set xrText(text) {
        this._xrText = text;
        if(this._deviceType == 'XR') this._textComponent.text = text;
    }

    set height(height) {
        this._height = height;
        this._block.height = height;
    }

    set width(width) {
        this._width = width;
        this._block.width = width;
        this._textComponent.maxWidth = width;
    }

    static assetId = '1b67a2a6-0049-4074-8b37-0c65010909ad';
    static assetName = 'Device Specific Text';
}

ProjectHandler.registerAsset(DeviceSpecificText);

if(EditorHelpers) {
    class DeviceSpecificTextHelper extends TextAssetHelper {
        constructor(asset) {
            super(asset);
            this._previewDevice = deviceType;
            this._createPreviewFunctions();
        }

        _createPreviewFunctions() {
            Object.defineProperty(this._asset, 'previewDevice', {
                get: () => { return this._previewDevice; },
                set: (previewDevice) => {
                    this._previewDevice = previewDevice;
                    this._asset._deviceType = previewDevice;
                    let text = this._asset._getDeviceText();
                    this._asset._textComponent.text = text;
                },
            });
        }

        static fields = [
            "visualEdit",
            { "parameter": "pointerText", "name": "Computer Text",
                "type": TextField },
            { "parameter": "touchScreenText", "name": "Touch Screen Text",
                "type": TextField },
            { "parameter": "xrText", "name": "XR Text", "type": TextField },
            { "parameter": "previewDevice", "name": "Preview Device",
                "map": {"Computer":"POINTER","Touch Screen":"TOUCH_SCREEN","XR":"XR"},
                "type": EnumField },
            "fontSize",
            { "parameter": "width", "name": "Width", "min": 0.000001,
                "type": NumberField },
            { "parameter": "height", "name": "Height", "min": 0.000001,
                "type": NumberField },
            "fontColor",
            { "parameter": "backgroundColor", "name": "Background Color",
                "type": ColorField },
            { "parameter": "backgroundOpacity", "name": "Background Opacity",
                "min": 0, "type": NumberField },
            { "parameter": "borderRadius", "name": "Border Radius",
                "min": 0, "type": NumberField },
            { "parameter": "padding", "name": "Padding",
                "min": 0, "type": NumberField },
            { "parameter": "justifyContent", "name": "Justify Content",
                "map": { "Start": "start", "Center": "center", "End": "end" },
                "type": EnumField },
            "textAlign",
            "position",
            "rotation",
            "scale",
            "renderOrder",
        ];
    }

    EditorHelperFactory.registerEditorHelper(DeviceSpecificTextHelper,
        DeviceSpecificText);
}
