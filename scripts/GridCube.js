const { Assets, EditorHelpers, ProjectHandler, THREE, getCamera, utils } = window.DigitalBacon;
const { CustomAssetEntity } = Assets;
const { CustomAssetEntityHelper, EditorHelperFactory } = EditorHelpers;
const { ColorField, NumberField } = CustomAssetEntityHelper.FieldTypes;
const { numberOr } = utils;

const { BufferGeometry, Float32BufferAttribute } = THREE;

//BoxLineGeometry from https://github.com/mrdoob/three.js/blob/dev/examples/jsm/geometries/BoxLineGeometry.js

class BoxLineGeometry extends BufferGeometry {
	constructor(width = 1, height = 1, depth = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1) {

		super();

		widthSegments = Math.floor(widthSegments);
		heightSegments = Math.floor(heightSegments);
		depthSegments = Math.floor(depthSegments);

		const widthHalf = width / 2;
		const heightHalf = height / 2;
		const depthHalf = depth / 2;

		const segmentWidth = width / widthSegments;
		const segmentHeight = height / heightSegments;
		const segmentDepth = depth / depthSegments;

		const vertices = [];

		let x = -widthHalf;
		let y = -heightHalf;
		let z = -depthHalf;

		for (let i = 0; i <= widthSegments; i ++) {
			vertices.push(x, -heightHalf, -depthHalf, x, heightHalf,-depthHalf);
			vertices.push(x, heightHalf, -depthHalf, x, heightHalf, depthHalf);
			vertices.push(x, heightHalf, depthHalf, x, -heightHalf, depthHalf);
			vertices.push(x, -heightHalf, depthHalf, x, -heightHalf,-depthHalf);
			x += segmentWidth;
		}
		for (let i = 0; i <= heightSegments; i ++) {
			vertices.push(-widthHalf, y, -depthHalf, widthHalf, y, -depthHalf);
			vertices.push(widthHalf, y, -depthHalf, widthHalf, y, depthHalf);
			vertices.push(widthHalf, y, depthHalf, -widthHalf, y, depthHalf);
			vertices.push(-widthHalf, y, depthHalf, -widthHalf, y, -depthHalf);
			y += segmentHeight;
		}
		for (let i = 0; i <= depthSegments; i ++) {
			vertices.push(-widthHalf, -heightHalf, z, -widthHalf, heightHalf,z);
			vertices.push(-widthHalf, heightHalf, z, widthHalf, heightHalf, z);
			vertices.push(widthHalf, heightHalf, z, widthHalf, -heightHalf, z);
			vertices.push(widthHalf, -heightHalf, z, -widthHalf, -heightHalf,z);
			z += segmentDepth;
		}
		this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
	}
}

export default class GridCube extends CustomAssetEntity {
    constructor(params = {}) {
        params['assetId'] = GridCube.assetId;
        super(params);
        this._color = numberOr(params['color'], 0x898989);
        this._depth = numberOr(params['depth'], 0.1);
        this._height = numberOr(params['height'], 0.1);
        this._width = numberOr(params['width'], 0.1);
        this._widthSegments = params['widthSegments'] || 1;
        this._heightSegments = params['heightSegments'] || 1;
        this._depthSegments = params['depthSegments'] || 1;
        this._createMesh();
    }

    _createMesh() {
        let geometry = new BoxLineGeometry(this._width, this._height,
            this._depth, this._widthSegments, this._heightSegments,
            this._depthSegments);
        let material = new THREE.LineBasicMaterial({ color: this._color });
        this._mesh = new THREE.LineSegments(geometry, material);
        this._object.add(this._mesh);
    }

    _getDefaultName() {
        return GridCube.assetName;
    }

    _updateGeometry() {
        this._object.remove(this._mesh);
        utils.fullDispose(this._mesh);
        this._createMesh();
    }

    exportParams() {
        let params = super.exportParams();
        params['color'] = this._color;
        params['depth'] = this._depth;
        params['height'] = this._height;
        params['width'] = this._width;
        params['depthSegments'] = this._depthSegments;
        params['heightSegments'] = this._heightSegments;
        params['widthSegments'] = this._widthSegments;
        return params;
    }

    get color() { return this._color; }
    get depth() { return this._depth; }
    get height() { return this._height; }
    get width() { return this._width; }
    get depthSegments() { return this._depthSegments; }
    get heightSegments() { return this._heightSegments; }
    get widthSegments() { return this._widthSegments; }

    set color(color) {
        this._color = color;
        this._mesh.material.color.set(color);
    }

    set depth(depth) {
        this._depth = depth;
        this._updateGeometry();
    }

    set height(height) {
        this._height = height;
        this._updateGeometry();
    }

    set width(width) {
        this._width = width;
        this._updateGeometry();
    }

    set depthSegments(depthSegments) {
        this._depthSegments = depthSegments;
        this._updateGeometry();
    }

    set heightSegments(heightSegments) {
        this._heightSegments = heightSegments;
        this._updateGeometry();
    }

    set widthSegments(widthSegments) {
        this._widthSegments = widthSegments;
        this._updateGeometry();
    }

    static assetId = 'ab6eadec-5012-41d0-ae48-830cf3a0b3b5';
    static assetName = 'Grid Cube';
}

ProjectHandler.registerAsset(GridCube);

if(EditorHelpers) {
    class GridCubeHelper extends CustomAssetEntityHelper {
        constructor(asset) {
            super(asset);
        }

        static fields = [
            "visualEdit",
            { "parameter": "color", "name": "Color", "type": ColorField },
            { "parameter": "width", "name": "Width", "min": 0,
                "type": NumberField },
            { "parameter": "height", "name": "Height", "min": 0,
                "type": NumberField },
            { "parameter": "depth", "name": "Depth", "min": 0,
                "type": NumberField },
            { "parameter": "widthSegments", "name": "Width Segments", "min": 1,
                "type": NumberField },
            { "parameter": "heightSegments", "name": "Height Segments", "min":1,
                "type": NumberField },
            { "parameter": "depthSegments", "name": "Depth Segments", "min": 1,
                "type": NumberField },
            "position",
            "rotation",
            "scale",
        ];
    }

    EditorHelperFactory.registerEditorHelper(GridCubeHelper,
        GridCube);
}
