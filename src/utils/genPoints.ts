export type BBox = [number, number, number, number];

export function genPoints(N: number, bbox: BBox = [-122.42, 37.78, -122.39, 37.8]) {
	const [minLng, minLat, maxLng, maxLat] = bbox;
	const features = [];
	for (let i = 0; i < N; i++) {
		const lng = Math.random() * (maxLng - minLng) + minLng;
		const lat = Math.random() * (maxLat - minLat) + minLat;
		features.push({
			type: "Feature",
			properties: {
				id: `p${i}`,
				type: ["restaurant", "cafe", "museum"][i % 3],
				rating: Math.round(Math.random() * 50) / 10
			},
			geometry: { type: "Point", coordinates: [lng, lat] }
		});
	}
	return { type: "FeatureCollection", features };
}


