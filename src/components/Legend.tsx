type LegendItem = { color: [number, number, number], label: string };

export default function Legend({ title, items }: { title: string; items: LegendItem[] }) {
	return (
		<div style={{
			position: 'absolute',
			bottom: 12,
			left: 12,
			background: 'rgba(255,255,255,0.9)',
			padding: 10,
			borderRadius: 8,
			boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
			fontFamily: 'Inter, system-ui, Arial, sans-serif',
			fontSize: 12,
			color: '#0f172a'
		}}>
			<div style={{fontWeight: 600, marginBottom: 6}}>{title}</div>
			{items.map((it, i) => (
				<div key={i} style={{display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4}}>
					<div style={{width: 14, height: 14, borderRadius: 3, background: `rgb(${it.color[0]}, ${it.color[1]}, ${it.color[2]})`, border: '1px solid #cbd5e1'}} />
					<div>{it.label}</div>
				</div>
			))}
		</div>
	);
}


