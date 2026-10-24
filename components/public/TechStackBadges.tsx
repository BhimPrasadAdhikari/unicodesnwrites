'use client';

import React from 'react';
import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiJavascript,
  SiNodedotjs,
  SiPython,
  SiMongodb,
  SiPostgresql,
  SiMysql,
  SiTailwindcss,
  SiDocker,
  SiAmazon,
  SiGooglecloud,
  SiVercel,
  SiGit,
  SiGithub,
  SiRedux,
  SiSass,
  SiKubernetes,
  SiTensorflow,
  SiPytorch,
  SiOpenai,
  SiFramer,
  SiStripe,
  SiExpress,
  SiFastapi,
  SiDjango,
  SiFlask,
} from 'react-icons/si';

interface TechStackBadgesProps {
  techStack: string[];
  limit?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const techIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  react: SiReact,
  'next.js': SiNextdotjs,
  nextjs: SiNextdotjs,
  typescript: SiTypescript,
  javascript: SiJavascript,
  node: SiNodedotjs,
  'node.js': SiNodedotjs,
  python: SiPython,
  mongodb: SiMongodb,
  postgresql: SiPostgresql,
  postgres: SiPostgresql,
  mysql: SiMysql,
  tailwind: SiTailwindcss,
  tailwindcss: SiTailwindcss,
  docker: SiDocker,
  aws: SiAmazon,
  'amazon web services': SiAmazon,
  gcp: SiGooglecloud,
  'google cloud': SiGooglecloud,
  vercel: SiVercel,
  git: SiGit,
  github: SiGithub,
  redux: SiRedux,
  sass: SiSass,
  scss: SiSass,
  kubernetes: SiKubernetes,
  tensorflow: SiTensorflow,
  pytorch: SiPytorch,
  openai: SiOpenai,
  'framer motion': SiFramer,
  framer: SiFramer,
  stripe: SiStripe,
  express: SiExpress,
  'express.js': SiExpress,
  fastapi: SiFastapi,
  django: SiDjango,
  flask: SiFlask,
};

const normalizeTechKey = (tech: string) => tech.trim().toLowerCase();

export default function TechStackBadges({ techStack, limit, className = '', size = 'sm' }: TechStackBadgesProps) {
  const displayStack = limit ? techStack.slice(0, limit) : techStack;
  const remaining = limit ? techStack.length - limit : 0;

  const sizeClasses = {
      sm: 'text-xs px-2 py-0.5',
      md: 'text-sm px-2.5 py-1',
      lg: 'text-base px-3 py-1.5'
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayStack.map((tech) => (
        (() => {
          const Icon = techIconMap[normalizeTechKey(tech)];
          return (
        <span 
            key={tech} 
            className={`inline-flex items-center rounded-md border border-border bg-card font-mono text-foreground ${sizeClasses[size]}`}
        >
          {Icon && <Icon className="mr-1.5 h-3.5 w-3.5" />}
          {tech}
        </span>
          );
        })()
      ))}
      {remaining > 0 && (
         <span className={`inline-flex items-center rounded-md bg-muted font-medium text-muted-foreground ring-1 ring-inset ring-border ${sizeClasses[size]}`}>
            +{remaining}
         </span>
      )}
    </div>
  );
}
