import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { DeckProps } from '@deck.gl/core';
import { GeoJsonLayer, LineLayer, ScatterplotLayer } from '@deck.gl/layers';
import { HexagonLayer, GridLayer } from '@deck.gl/aggregation-layers';
import { TripsLayer } from '@deck.gl/geo-layers';
import * as d3 from 'd3-scale';
import Controls, { type LayerToggles } from './Controls';
import Legend from './Legend';
import pointsData from '../data/points.json';
import polygonsData from '../data/polygons.json';
import routesData from '../data/routes.json';
import tripsData from '../data/trips.json';
import { genPoints } from '../utils/genPoints';
import 'maplibre-gl/dist/maplibre-gl.css';
import useTripsAnimation from '../hooks/useTripsAnimation';

type ViewState = {
	longitude: number;
	latitude: number;
	zoom: number;
	pitch: number;
	bearing: number;
};

const INITIAL_VIEW_STATE: ViewState = {
	longitude: -122.407,
	latitude: 37.786,
	zoom: 13.2,
	pitch: 40,
	bearing: -10
};

const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export default function MapView() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const overlayRef = useRef<MapboxOverlay | null>(null);

	const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
	const [layerToggles, setLayerToggles] = useState<LayerToggles>({
		points: true,
		cluster: false,
		polygons: true,
		routes: true,
		trips: true,
		hexagon: false
	});
	const [categoryFilter, setCategoryFilter] = useState<string>('all');
	const categories = useMemo(() => {
		const set = new Set<string>();
		for (const f of pointsData.features as any[]) {
			if (f.properties?.type) set.add(f.properties.type);
		}
		return Array.from(set);
	}, []);

	// Generate 10k random points
	const bigPoints = useMemo(() => genPoints(10000), []);

	const [tripStart, tripEnd] = useMemo(() => {
		const times: number[] = [];
		for (const trip of (tripsData as any[])) {
			for (const p of trip.path) times.push(p.timestamp);
		}
		const min = Math.min(...times);
		const max = Math.max(...times);
		return [min, max] as const;
	}, []);
	const tripDuration = tripEnd - tripStart;
	const { time, setTime, isPlaying, setIsPlaying } = useTripsAnimation([0, tripDuration], false);

	const valueExtent = useMemo(() => {
		const vals = (polygonsData.features as any[]).map(f => f.properties?.value ?? 0);
		return [Math.min(...vals), Math.max(...vals)] as [number, number];
	}, []);
	const colorScale = useMemo(() => {
		const range: [number, number, number][] = [
			[237, 248, 251],
			[191, 211, 230],
			[158, 188, 218],
			[140, 150, 198],
			[136, 86, 167]
		];
		const s = (d3 as any).scaleQuantize().domain(valueExtent).range(range);
		return (v: number): [number, number, number] => s(v) as [number, number, number];
	}, [valueExtent]);

	const updateDeck = useCallback((props: Partial<DeckProps>) => {
		if (overlayRef.current) {
			overlayRef.current.setProps(props);
		}
	}, []);

	useEffect(() => {
		if (!containerRef.current) return;
		const map = new maplibregl.Map({
			container: containerRef.current,
			style: BASEMAP_STYLE,
			center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
			zoom: INITIAL_VIEW_STATE.zoom,
			pitch: INITIAL_VIEW_STATE.pitch,
			bearing: INITIAL_VIEW_STATE.bearing,
			cooperativeGestures: true
		});
		mapRef.current = map;

		const overlay = new MapboxOverlay({
			interleaved: true,
			layers: []
		});
		overlayRef.current = overlay;
		map.addControl(overlay);

		map.on('move', () => {
			const c = map.getCenter();
			setViewState({
				longitude: c.lng,
				latitude: c.lat,
				zoom: map.getZoom(),
				pitch: map.getPitch(),
				bearing: map.getBearing()
			});
		});

		return () => {
			overlay.finalize();
			map.remove();
		};
	}, []);

	const filteredPoints = useMemo(() => {
		if (categoryFilter === 'all') return pointsData;
		return {
			...pointsData,
			features: (pointsData.features as any[]).filter(f => f.properties?.type === categoryFilter)
		};
	}, [categoryFilter]);

	const layers = useMemo(() => {
		const ls: any[] = [];
		const commonPick = {
			pickable: true,
			autoHighlight: true,
			highlightColor: [255, 255, 0, 128]
		};

		if (layerToggles.polygons) {
			ls.push(new GeoJsonLayer({
				id: 'polygons',
				data: polygonsData as any,
				stroked: true,
				filled: true,
				lineWidthMinPixels: 1,
				getLineColor: [60, 60, 60, 180],
				getFillColor: (f: any) => {
					const rgb = colorScale(f.properties?.value ?? 0);
					return [rgb[0], rgb[1], rgb[2], 200];
				},
				updateTriggers: { getFillColor: [colorScale] },
				...commonPick
			}));
		}

		if (layerToggles.routes) {
			ls.push(new LineLayer({
				id: 'routes',
				data: routesData as any,
				getSourcePosition: (f: any) => f.geometry.coordinates[0],
				getTargetPosition: (f: any) => f.geometry.coordinates[1],
				getColor: () => [66, 135, 245, 180],
				getWidth: (f: any) => Math.max(1, (f.properties?.volume ?? 1) / 40),
				widthUnits: 'pixels',
				...commonPick
			}));
		}

		if (layerToggles.points && !layerToggles.cluster) {
			ls.push(new ScatterplotLayer({
				id: 'points',
				data: (filteredPoints as any).features,
				getPosition: (f: any) => f.geometry.coordinates,
				getFillColor: (f: any) => {
					const t = f.properties?.type;
					return t === 'restaurant' ? [255, 107, 107] : t === 'cafe' ? [77, 171, 247] : [160, 217, 149];
				},
				getRadius: 30,
				radiusUnits: 'meters',
				...commonPick
			}));
		}

		if (layerToggles.points && layerToggles.cluster) {
			ls.push(new GridLayer({
				id: 'points-cluster',
				data: (filteredPoints as any).features,
				getPosition: (f: any) => f.geometry.coordinates,
				cellSize: 100, // meters
				extruded: false,
				pickable: true,
				colorRange: [
					[49, 130, 189, 80],
					[107, 174, 214, 120],
					[158, 202, 225, 160],
					[198, 219, 239, 200],
					[239, 243, 255, 240]
				],
				getColorWeight: () => 1,
				colorAggregation: 'SUM',
				coverage: 1
			}));
		}

		if (layerToggles.hexagon) {
			ls.push(new HexagonLayer({
				id: 'hexagon',
				data: (bigPoints as any).features,
				getPosition: (f: any) => f.geometry.coordinates,
				radius: 60,
				extruded: true,
				elevationScale: 4,
				pickable: true,
				colorRange: [
					[254, 240, 217],
					[253, 204, 138],
					[252, 141, 89],
					[227, 74, 51],
					[179, 0, 0]
				]
			}));
		}

		if (layerToggles.trips) {
			ls.push(new TripsLayer({
				id: 'trips',
				data: tripsData as any,
				getPath: (d: any) => d.path.map((p: any) => p.coordinates),
				getTimestamps: (d: any) => d.path.map((p: any) => p.timestamp),
				getColor: [255, 209, 102],
				opacity: 0.9,
				widthMinPixels: 3,
				rounded: true,
				trailLength: 120000, // ms
				currentTime: tripStart + time
			}));
		}

		return ls;
	}, [layerToggles, filteredPoints, bigPoints, colorScale, time]);

	const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
	const hideTooltipRef = useRef<number | null>(null);

	useEffect(() => {
		const buildTooltipText = (object: any) => {
			if (!object) return null;
			if (object.geometry?.type === 'Point') {
				const p = object.properties;
				return `POI ${p?.id}\n${p?.type} • rating ${p?.rating}`;
			}
			if (object.geometry?.type === 'Polygon') {
				const p = object.properties;
				return `Region ${p?.region}\nValue ${p?.value}`;
			}
			if (object.sourcePosition && object.targetPosition) {
				const p = object.properties;
				return `Route ${p?.from} → ${p?.to}\nVol ${p?.volume}`;
			}
			if (object.centroid || object.position) {
				return `Count ${object.count || object.points?.length || 0}`;
			}
			return null;
		};

		updateDeck({
			layers,
			onHover: info => {
				if (hideTooltipRef.current) {
					window.clearTimeout(hideTooltipRef.current);
					hideTooltipRef.current = null;
				}
				const text = buildTooltipText(info.object as any);
				if (text) {
					setTooltip({ x: info.x, y: info.y, text });
				} else {
					hideTooltipRef.current = window.setTimeout(() => setTooltip(null), 700);
				}
			},
			onClick: info => {
				if (info.coordinate && mapRef.current) {
					const [lng, lat] = info.coordinate;
					mapRef.current.easeTo({ center: [lng, lat], zoom: Math.max(viewState.zoom, 14) });
				}
			}
		});
	}, [layers, updateDeck, viewState.zoom]);

	const legendItems = useMemo(() => {
		const thresholds = (colorScale as any).thresholds?.() || (colorScale as any).quantiles?.() || [];
		const domain = [valueExtent[0], ...thresholds, valueExtent[1]];
		const items: { color: [number, number, number], label: string }[] = [];
		for (let i = 0; i < domain.length - 1; i++) {
			const mid = (domain[i] + domain[i + 1]) / 2;
			items.push({
				color: colorScale(mid),
				label: `${Math.round(domain[i])}–${Math.round(domain[i + 1])}`
			});
		}
		return items;
	}, [colorScale, valueExtent]);

	const handleToggle = (k: keyof LayerToggles, v: boolean) => {
		setLayerToggles(s => ({ ...s, [k]: v }));
	};

	const timeLabel = useMemo(() => {
		if (tripDuration <= 0) return '0:00 / 0:00';
		const format = (ms: number) => {
			const totalSeconds = Math.max(0, Math.round(ms / 1000));
			const m = Math.floor(totalSeconds / 60);
			const s = totalSeconds % 60;
			return `${m}:${s.toString().padStart(2, '0')}`;
		};
		return `${format(time)} / ${format(tripDuration)}`;
	}, [time, tripDuration]);

	return (
		<div style={{height: '100%', width: '100%', position: 'relative'}}>
			<div ref={containerRef} style={{height: '100%', width: '100%'}} />
			<Controls
				layerToggles={layerToggles}
				onToggle={handleToggle}
				categoryFilter={categoryFilter}
				onCategoryChange={setCategoryFilter}
				time={time}
				setTime={setTime}
				isPlaying={isPlaying}
				onPlayPause={() => setIsPlaying(p => !p)}
				timeBounds={[0, tripDuration]}
				categories={categories}
				timeLabel={timeLabel}
			/>
			{layerToggles.polygons && <Legend title="Region value" items={legendItems} />}
			{tooltip && (
				<div
					style={{
						position: 'absolute',
						left: tooltip.x + 12,
						top: tooltip.y + 12,
						background: 'rgba(255,255,255,0.98)',
						color: '#0f172a',
						padding: '8px 10px',
						borderRadius: 6,
						boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
						pointerEvents: 'none',
						whiteSpace: 'pre-line',
						fontSize: 12,
						maxWidth: 240
					}}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	);
}


