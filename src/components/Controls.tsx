import { useMemo } from 'react';

export type LayerToggles = {
	points: boolean;
	cluster: boolean;
	polygons: boolean;
	routes: boolean;
	trips: boolean;
	hexagon: boolean;
};

export type ControlsProps = {
	layerToggles: LayerToggles;
	onToggle: (key: keyof LayerToggles, value: boolean) => void;
	categoryFilter: string;
	onCategoryChange: (value: string) => void;
	time: number;
	setTime: (t: number) => void;
	isPlaying: boolean;
	onPlayPause: () => void;
	timeBounds: [number, number];
	categories: string[];
	timeLabel: string;
};

export default function Controls(props: ControlsProps) {
	const {
		layerToggles, onToggle, categoryFilter, onCategoryChange,
		time, setTime, isPlaying, onPlayPause, timeBounds, categories, timeLabel
	} = props;

	const [minTime, maxTime] = timeBounds;
	const percent = useMemo(() => {
		if (maxTime === minTime) return 0;
		return Math.round(((time - minTime) / (maxTime - minTime)) * 100);
	}, [time, minTime, maxTime]);

	return (
		<div style={{
			position: 'absolute',
			top: 12,
			left: 12,
			background: 'rgba(255,255,255,0.9)',
			padding: 12,
			borderRadius: 8,
			width: 320,
			boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
			fontFamily: 'Inter, system-ui, Arial, sans-serif',
			fontSize: 14,
			color: '#0f172a'
		}}>
			<div style={{fontWeight: 600, marginBottom: 8}}>Layers</div>
			<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8}}>
				<label><input type="checkbox" checked={layerToggles.points} onChange={e => onToggle('points', e.target.checked)} /> Points</label>
				<label><input type="checkbox" checked={layerToggles.cluster} onChange={e => onToggle('cluster', e.target.checked)} /> Cluster</label>
				<label><input type="checkbox" checked={layerToggles.polygons} onChange={e => onToggle('polygons', e.target.checked)} /> Polygons</label>
				<label><input type="checkbox" checked={layerToggles.routes} onChange={e => onToggle('routes', e.target.checked)} /> Routes</label>
				<label><input type="checkbox" checked={layerToggles.trips} onChange={e => onToggle('trips', e.target.checked)} /> Trips</label>
				<label><input type="checkbox" checked={layerToggles.hexagon} onChange={e => onToggle('hexagon', e.target.checked)} /> Hexagon</label>
			</div>

			<div style={{marginTop: 12}}>
				<div style={{fontWeight: 600, marginBottom: 6}}>Filter: POI type</div>
				<select value={categoryFilter} onChange={e => onCategoryChange(e.target.value)} style={{width: '100%', padding: '6px 8px'}}>
					<option value="all">All</option>
					{categories.map(c => <option key={c} value={c}>{c}</option>)}
				</select>
			</div>

			<div style={{marginTop: 12}}>
				<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
					<div style={{fontWeight: 600}}>Trips time</div>
					<button onClick={onPlayPause} style={{padding: '4px 8px'}}>
						{isPlaying ? 'Pause' : 'Play'}
					</button>
				</div>
				<input
					type="range"
					min={minTime}
					max={maxTime}
					value={time}
					onChange={e => setTime(Number(e.target.value))}
					style={{width: '100%'}}
				/>
				<div style={{fontSize: 12, color: '#334155'}}>{timeLabel} • {percent}%</div>
			</div>
		</div>
	);
}


