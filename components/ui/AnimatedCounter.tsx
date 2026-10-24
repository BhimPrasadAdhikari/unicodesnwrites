'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [hasMounted, setHasMounted] = useState(false);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    const controls = animate(count, value, { duration });
    return controls.stop;
  }, [value, count, duration, hasMounted]);


  if (!hasMounted) return <span>{value}</span>;

  return <motion.span>{rounded}</motion.span>;
}
