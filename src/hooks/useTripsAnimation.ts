import { useEffect, useRef, useState } from 'react';

export default function useTripsAnimation(bounds: [number, number], playingDefault = false) {
	const [time, setTime] = useState(bounds[0]);
	const [isPlaying, setIsPlaying] = useState(playingDefault);
	const raf = useRef<number | null>(null);

	useEffect(() => {
		if (!isPlaying) {
			if (raf.current) cancelAnimationFrame(raf.current);
			raf.current = null;
			return;
		}
		const step = () => {
			setTime(t => {
				const next = t + 1000;
				return next > bounds[1] ? bounds[0] : next;
			});
			raf.current = requestAnimationFrame(step);
		};
		raf.current = requestAnimationFrame(step);
		return () => {
			if (raf.current) cancelAnimationFrame(raf.current);
		};
	}, [isPlaying, bounds]);

	return { time, setTime, isPlaying, setIsPlaying };
}


