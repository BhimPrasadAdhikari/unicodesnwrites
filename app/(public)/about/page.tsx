import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Download, Mail, Phone } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Section, Container } from '@/components/ui/Section'
import { SkillsBentoGrid } from '@/components/public/SkillsBentoGrid'
import { siteConfig } from '@/lib/config/site.config'
import { ResumeDownloadLink } from '@/components/public/ResumeDownloadLink'

const professionalExperience = [
   {
      title: 'Co-founder & CTO',
      subtitle: 'Lagnever AI · 2025 - Present',
      description: 'Helping shape AI products for education and enterprise, translating product direction into practical technical execution and scalable system decisions.',
   },
   {
      title: 'Technical Writer',
      subtitle: '2024 - Present',
      description: 'Publishing articles on AI, machine learning, and web engineering with a focus on making complex ideas easier to understand and apply.',
   },
]

const projectExperience = [
   {
      title: 'AI-Powered Agriculture Platform',
      subtitle: 'Personal Project · Next.js, TypeScript, MongoDB, Google Cloud, Vertex AI, Dialogflow CX, Pusher, Vercel',
      description: 'Built a production-oriented agriculture platform that detects plant diseases with a CNN, generates field insights with Vertex AI and LLM workflows, and answers farmer questions through a contextual chatbot.',
      link: 'https://agritech-sigma.vercel.app',
      linkLabel: 'View live platform',
   },
   {
      title: 'RAG Chatbot with LangChain & Pinecone',
      subtitle: 'Team Project · Node.js, Express, LangChain, Pinecone, Docker, Google Cloud Run',
      description: 'Developed a retrieval-augmented chatbot backed by Pinecone vector search, then containerized and deployed the query service on Google Cloud Run.',
   },
   {
      title: 'Multi-Agent RAG Chatbot',
      subtitle: 'Personal Project · Python, FastAPI, Google Document AI, Gemini, Vector Search, Docker, Google Cloud Run',
      description: 'Built a multi-agent chatbot workflow that combines document extraction, Gemini-based reasoning, and containerized FastAPI services for deployment-ready query handling.',
   },
   {
      title: 'Multi-Merchant E-commerce Platform',
      subtitle: 'Personal Project · Vue, MongoDB, GraphQL, Vendure, Stripe',
      description: 'Designed and developed a multi-vendor commerce platform with product listing, authentication, and order management capabilities across a shared storefront architecture.',
   },
]

const education = [
   {
      title: 'Bachelor of Technology in Computer Science & Engineering',
      subtitle: 'CV Raman Global University, Bhubaneswar, Odisha, India',
      detail: 'Specialization in Artificial Intelligence & Machine Learning · Ongoing (Expected Graduation: 2028)',
   },
   {
      title: '+2 (Science Stream)',
      subtitle: 'Tilottama Campus, Yogikuti-2, Tilottama, Rupandehi, Nepal',
      detail: 'Year of passing: 2080 · GPA: 3.82 / 4.0',
   },
   {
      title: 'Secondary Education Examinations (SEE)',
      subtitle: 'Mahamaya Bhawani Secondary School, Devdaha-4, Rupandehi, Nepal',
      detail: 'Year of passing: 2078 · GPA: 3.96 / 4.0',
   },
]

export const metadata: Metadata = {
   title: `Portfolio · ${siteConfig.author.name}`,
   description: `The personal portfolio, background, skills, and experience of ${siteConfig.author.name}.`,
}

export default function AboutPage() {
   return (
      <div className="flex flex-col">
         <Section className="border-b border-border pb-12 pt-12 md:pb-16 md:pt-16">
            <Container>
               <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                  <div className="space-y-6">
                     <p className="text-eyebrow text-primary">§ About</p>

                     <h1 className="text-title">
                        The person behind the notes, articles, and shipped systems
                     </h1>

                     <p className="font-serif text-[19px] leading-[1.55] text-muted-foreground sm:text-[22px]">
                        I&apos;m <span className="hl text-foreground">{siteConfig.author.name}</span> — an ML engineer and technical writer based in India. I&apos;ve shipped AI systems for agriculture, conversational interfaces, and document processing, and I write about the decisions that shaped them.
                     </p>

                     <p className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">
                        <span>{siteConfig.author.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>{siteConfig.author.hometown}</span>
                        <span aria-hidden="true">·</span>
                        <span>CV Raman Global University</span>
                     </p>

                     <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                        <Button asChild>
                           <ResumeDownloadLink url={siteConfig.author.resumeUrl} className="flex items-center gap-2">
                              <Download className="h-4 w-4" /> Download résumé
                           </ResumeDownloadLink>
                        </Button>
                        <Button variant="outline" asChild>
                           <Link href="/contact">Get in touch</Link>
                        </Button>
                     </div>

                     <div className="flex flex-wrap gap-x-5 text-sm text-muted-foreground">
                        <a href={`mailto:${siteConfig.author.email}`} className="inline-flex min-h-11 items-center gap-2 hover:text-foreground">
                           <Mail className="h-4 w-4" />
                           {siteConfig.author.email}
                        </a>
                        <a href={siteConfig.author.phoneHref} className="inline-flex min-h-11 items-center gap-2 hover:text-foreground">
                           <Phone className="h-4 w-4" />
                           {siteConfig.author.phone}
                        </a>
                     </div>
                  </div>

                  <div className="mx-auto w-full max-w-sm">
                     <div className="relative aspect-[3/4] overflow-hidden rounded-3xl border border-border">
                        <Image
                           src="/uploads/profile.png"
                           alt="Bhim Prasad Adhikari"
                           fill
                           className="object-cover"
                           priority
                        />
                     </div>
                     <div className="mt-5 space-y-1">
                        <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-muted-foreground">{siteConfig.author.role}</p>
                        <p className="pen-note mt-2 text-base">{siteConfig.author.name}</p>
                     </div>
                  </div>
               </div>
            </Container>
         </Section>

         <Section className="py-12 md:py-16">
            <Container>
               <div className="prose prose-lg mx-auto max-w-3xl dark:prose-invert prose-headings:font-serif prose-headings:font-medium prose-p:font-serif prose-p:text-[19px] prose-p:leading-[1.65] prose-p:text-foreground prose-a:text-foreground prose-a:decoration-primary prose-strong:text-foreground">
                   <h3 className="text-2xl font-medium">What I&apos;m looking for</h3>
                   <p>
                      I&apos;m looking for ML engineering roles where I can own the full arc — from model experiments to production. I&apos;ve done this already: a CNN-backed agriculture platform, RAG chatbots containerised on Cloud Run, and a multi-agent document pipeline built with Google Document AI and Gemini. I write about the builds as I go.
                   </p>

                   <h3 className="mt-8 text-2xl font-medium">What I&apos;ve built</h3>
                   <p>
                      An AI-powered agriculture platform using a CNN for plant disease detection, Vertex AI for field insights, and Dialogflow CX for contextual farmer support. RAG chatbots with LangChain and Pinecone. Multi-agent document workflows with Google Document AI and Gemini. Production web systems using Next.js, FastAPI, Node.js, and MongoDB.
                   </p>
                   <p>
                      If you&apos;re hiring for applied AI, conversational AI, ML infrastructure, or full-stack AI product roles — this portfolio is designed to make the work easy to evaluate.
                   </p>
               </div>
            </Container>
         </Section>

         <SkillsBentoGrid />

         <Section>
            <Container>
               <div className="mb-12">
                  <p className="text-eyebrow text-primary">§ Record</p>
                  <h2 className="mt-3 font-serif text-[clamp(1.875rem,4vw,3rem)] font-medium tracking-[-0.02em]">Experience and education</h2>
               </div>

               <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                     <h3 className="mb-6 text-eyebrow text-muted-foreground">Professional Experience</h3>
                     <div className="space-y-8">
                        {professionalExperience.map((item) => (
                           <div key={item.title} className="relative pl-6 before:absolute before:left-0 before:top-1 before:h-full before:w-0.5 before:bg-border">
                              <h4 className="font-serif text-xl font-medium">{item.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
                              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.description}</p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div>
                     <h3 className="mb-6 text-eyebrow text-muted-foreground">Selected Project Experience</h3>
                     <div className="space-y-8">
                        {projectExperience.map((item) => (
                           <div key={item.title} className="relative pl-6 before:absolute before:left-0 before:top-1 before:h-full before:w-0.5 before:bg-border">
                              <h4 className="font-serif text-xl font-medium">{item.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
                              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{item.description}</p>
                              {item.link ? (
                                 <a
                                    href={item.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
                                 >
                                    {item.linkLabel}
                                    <ArrowUpRight className="h-4 w-4" />
                                 </a>
                              ) : null}
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="mt-16">
                  <h3 className="mb-6 text-eyebrow text-muted-foreground">Education</h3>
                  <div className="grid gap-8 md:grid-cols-3">
                     {education.map((item) => (
                        <div key={item.title} className="relative pl-6 before:absolute before:left-0 before:top-1 before:h-full before:w-0.5 before:bg-border">
                           <h4 className="font-serif text-lg font-medium">{item.title}</h4>
                           <p className="text-sm text-muted-foreground mt-1">{item.subtitle}</p>
                           <p className="text-sm text-muted-foreground mt-2">{item.detail}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </Container>
         </Section>
      </div>
   )
}
