/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const { Assets, DigitalBaconUI, EditorHelpers, ProjectHandler, getCamera, utils } = window.DigitalBacon;
const { CustomAssetEntityHelper, EditorHelperFactory } = EditorHelpers;
const { ColorField, EnumField, NumberField, TextField } = CustomAssetEntityHelper.FieldTypes;
const { numberOr } = utils;

import * as THREE from 'three';

export default class Text extends Assets.CustomAssetEntity {
    constructor(params = {}) {
        super(params);
        this._backgroundColor = new THREE.Color(
            numberOr(params['backgroundColor'],  0x000000));
        this._backgroundOpacity = numberOr(params['backgroundOpacity'], 1);
        this._borderRadius = numberOr(params['borderRadius'], 0.1);
        this._fontColor = new THREE.Color(
            numberOr(params['fontColor'], 0xffffff));
        this._fontSize = numberOr(params['fontSize'], 0.1);
        this._justifyContent = params['justifyContent'] || 'center';
        this._padding = numberOr(params['padding'], 0);
        this._text = params['text'] || 'Hi :)';
        this._textAlign = params['textAlign'] || 'left';
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
        this._textComponent = new DigitalBaconUI.Text(this._text, {
            color: this._fontColor,
            fontSize: this._fontSize,
            maxWidth: this._width,
            textAlign: this._textAlign,
            width: '100%',
        });
        this._block.add(this._textComponent);
        this._object.add(this._block);
    }

    _getDefaultName() {
        return Text.assetName;
    }

    exportParams() {
        let params = super.exportParams();
        params['backgroundColor'] = this._backgroundColor.getHex();
        params['backgroundOpacity'] = this._backgroundOpacity;
        params['borderRadius'] = this._borderRadius;
        params['fontColor'] = this._fontColor.getHex();
        params['fontSize'] = this._fontSize;
        params['height'] = this._height;
        params['justifyContent'] = this._justifyContent;
        params['padding'] = this._padding;
        params['text'] = this._text;
        params['textAlign'] = this._textAlign;
        params['width'] = this._width;
        return params;
    }

    get backgroundColor() { return this._backgroundColor.getHex(); }
    get backgroundOpacity() { return this._backgroundOpacity; }
    get borderRadius() { return this._borderRadius; }
    get fontColor() { return this._fontColor.getHex(); }
    get fontSize() { return this._fontSize; }
    get justifyContent() { return this._justifyContent; }
    get padding() { return this._padding; }
    get text() { return this._text; }
    get textAlign() { return this._textAlign; }
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

    set fontColor(fontColor) {
        this._fontColor.set(fontColor);
        this._textComponent.color = this._fontColor;
    }

    set fontSize(fontSize) {
        this._fontSize = fontSize;
        this._textComponent.fontSize = fontSize;
    }

    set justifyContent(justifyContent) {
        this._justifyContent = justifyContent;
        this._block.justifyContent = justifyContent;
    }

    set padding(padding) {
        this._padding = padding;
        this._block.padding = padding;
    }

    set text(text) {
        this._text = text;
        this._textComponent.text = text;
    }

    set textAlign(textAlign) {
        this._textAlign = textAlign;
        this._textComponent.textAlign = textAlign;
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

    static assetId = '270aff2d-3706-4b36-bc36-c13c974d819f';
    static assetName = 'Text';
}

ProjectHandler.registerAsset(Text);

if(EditorHelpers) {
    class TextHelper extends CustomAssetEntityHelper {
        constructor(asset) {
            super(asset);
        }

        place(intersection) {
            let vector3 = new THREE.Vector3();
            let { object, point } = intersection;
            object.updateMatrixWorld();
            let normal = intersection.face.normal.clone()
                .transformDirection(object.matrixWorld).clampLength(0, 0.001);
            if(getCamera().getWorldDirection(vector3).dot(normal) > 0)
                normal.negate();
            point.add(normal);
            this._object.position.copy(point);
            this._object.parent.worldToLocal(this._object.position);
            point.add(normal);
            this._object.lookAt(point);
            this.roundAttributes(true);
        }

        static fields = [
            "visualEdit",
            { "parameter": "text", "name": "Text", "type": TextField },
            { "parameter": "fontSize", "name": "Font Size", "min": 0,
                "type": NumberField },
            { "parameter": "width", "name": "Width", "min": 0.000001,
                "type": NumberField },
            { "parameter": "height", "name": "Height", "min": 0.000001,
                "type": NumberField },
            { "parameter": "fontColor", "name": "Font Color",
                "type": ColorField },
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
            { "parameter": "textAlign", "name": "Text Alignment",
                "map": { "Left": "left", "Center": "center", "Right": "right" },
                "type": EnumField },
            "position",
            "rotation",
            "scale",
        ];
    }

    EditorHelperFactory.registerEditorHelper(TextHelper,
        Text);
}
