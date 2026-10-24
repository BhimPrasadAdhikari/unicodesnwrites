"use client"

import { 
  SiReact, SiNextdotjs, SiTailwindcss, SiTypescript,
  SiPython, SiTensorflow, SiPytorch,
  SiNodedotjs, SiFastapi, SiMongodb, SiPostgresql,
  SiGit, SiDocker, SiVercel, SiLangchain, SiFirebase,
  SiRedis, SiGooglecloud, SiDjango, SiExpress
} from "react-icons/si"
import { motion } from "framer-motion"
import { BarChart3, Bot, Cloud, Cpu, Database, FileText, Layout, MessageSquare, Server, Wrench } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Section, Container } from "@/components/ui/Section"

const skills = {
  applied_ai: [
    { name: "TensorFlow", icon: SiTensorflow, color: "text-orange-500" },
    { name: "PyTorch", icon: SiPytorch, color: "text-red-500" },
    { name: "LangChain", icon: SiLangchain, color: "text-green-600" },
    { name: "Gemini", icon: Bot, color: "text-violet-500" },
    { name: "RAG", icon: Database, color: "text-blue-500" },
  ],
  frontend: [
    { name: "React", icon: SiReact, color: "text-blue-400" },
    { name: "Next.js", icon: SiNextdotjs, color: "text-foreground" },
    { name: "TypeScript", icon: SiTypescript, color: "text-blue-500" },
    { name: "Tailwind CSS", icon: SiTailwindcss, color: "text-cyan-400" },
  ],
  backend: [
    { name: "Python", icon: SiPython, color: "text-yellow-400" },
    { name: "Node.js", icon: SiNodedotjs, color: "text-green-500" },
    { name: "FastAPI", icon: SiFastapi, color: "text-teal-400" },
    { name: "Django", icon: SiDjango, color: "text-green-800" },
    { name: "Express", icon: SiExpress, color: "text-foreground" },
  ],
  data: [
    { name: "MongoDB", icon: SiMongodb, color: "text-green-400" },
    { name: "PostgreSQL", icon: SiPostgresql, color: "text-blue-300" },
    { name: "Redis", icon: SiRedis, color: "text-red-500" },
    { name: "BigQuery", icon: BarChart3, color: "text-sky-500" },
    { name: "Vector DBs", icon: Database, color: "text-indigo-500" },
  ],
  cloud: [
    { name: "Google Cloud", icon: SiGooglecloud, color: "text-blue-500" },
    { name: "Vertex AI", icon: Cloud, color: "text-sky-500" },
    { name: "Dialogflow CX", icon: MessageSquare, color: "text-emerald-500" },
    { name: "Document AI", icon: FileText, color: "text-orange-500" },
    { name: "Firebase", icon: SiFirebase, color: "text-yellow-500" },
  ],
  devops: [
    { name: "Docker", icon: SiDocker, color: "text-blue-500" },
    { name: "Git", icon: SiGit, color: "text-orange-600" },
    { name: "Vercel", icon: SiVercel, color: "text-foreground" },
    { name: "Cloud Run", icon: Cloud, color: "text-sky-500" },
  ]
}

const categoryConfig = {
  applied_ai: {
    label: "Applied AI",
    icon: Cpu,
    iconBg: "bg-secondary",
    iconColor: "text-foreground"
  },
  frontend: { 
    label: "Frontend Development", 
    icon: Layout,
    iconBg: "bg-secondary",
    iconColor: "text-foreground"
  },
  backend: { 
    label: "Backend Development", 
    icon: Server,
    iconBg: "bg-secondary",
    iconColor: "text-foreground"
  },
  data: {
    label: "Data & Storage",
    icon: Database,
    iconBg: "bg-secondary",
    iconColor: "text-foreground"
  },
  cloud: { 
    label: "Cloud Services", 
    icon: Cloud,
    iconBg: "bg-secondary",
    iconColor: "text-foreground"
  },
  devops: { 
    label: "DevOps & Delivery", 
    icon: Wrench,
    iconBg: "bg-secondary",
    iconColor: "text-foreground"
  }
}

export function SkillsBentoGrid() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <Section>
      <Container>
        <div className="mb-12">
          <p className="text-eyebrow text-primary">§ Stack</p>
          <h2 className="mt-3 font-serif text-[clamp(1.875rem,4vw,3rem)] font-medium tracking-[-0.02em]">Skills and tools I use</h2>
        </div>
        
        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {(Object.keys(skills) as Array<keyof typeof skills>).map((category) => {
            const config = categoryConfig[category]
            const CategoryIcon = config.icon
            
            return (
              <motion.div key={category} variants={item}>
                <div className="h-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`p-2 rounded-lg ${config.iconBg}`}>
                      <CategoryIcon className={`h-4 w-4 ${config.iconColor}`} />
                    </div>
                    <h3 className="text-eyebrow text-muted-foreground">{config.label}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {skills[category].map((skill) => (
                      <div 
                        key={skill.name} 
                        className="flex flex-col items-center justify-center p-3 rounded-xl hover:bg-muted/40 transition-colors duration-200 group"
                      >
                        <skill.icon className={`h-7 w-7 mb-2 ${skill.color} group-hover:scale-105 transition-transform`} />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center">{skill.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </Container>
    </Section>
  )
}
