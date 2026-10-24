"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowUpRight, FileText, Github, Linkedin, Mail, MapPin, Phone } from "lucide-react"

import { Button } from "@/components/ui/Button"
import { Container } from "@/components/ui/Section"
import { siteConfig } from "@/lib/config/site.config"
import { ResumeDownloadLink } from "./ResumeDownloadLink"
import { useEventTracker } from "@/hooks/useEventTracker"

const heroSignals = [
  "Built a plant disease CNN → shipped to production on Google Cloud",
  "RAG chatbots with LangChain + Pinecone, containerised on Cloud Run",
  "Co-founder & CTO at Lagnever AI — AI products for education & enterprise",
]

export function Hero() {
  const { trackEvent } = useEventTracker();

  const handleReadAboutClick = () => {
    trackEvent('cta_button_click', {
      action: 'read_about',
      location: 'hero-section',
      category: 'engagement',
    });
  };

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center bg-background pt-16 pb-16 md:pt-20">
      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid gap-12 lg:grid-cols-[0.84fr_1.16fr] lg:items-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto w-full max-w-sm lg:mx-0"
          >
            <div className="relative overflow-hidden rounded-xl">
              <div className="relative aspect-[4/5]">
                <Image
                  src="/uploads/profile.png"
                  alt="Bhim Prasad Adhikari"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              {siteConfig.author.name} · {siteConfig.author.shortRole}
            </p>
          </motion.div>

          <div className="space-y-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="text-eyebrow text-muted-foreground"
            >
              About & availability
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-serif text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl text-foreground"
            >
              I build AI systems and <span className="text-primary">write about what I learn</span> doing it
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-5"
            >
              <p className="max-w-[700px] text-lg leading-relaxed text-muted-foreground">
                I&apos;m <span className="font-semibold text-primary">{siteConfig.author.name}</span> — an ML engineer and technical writer. I own the full build: model experiments, application integration, and cloud deployment. I write about the decisions that shaped each system as I go.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {heroSignals.map((signal) => (
                  <li key={signal} className="flex items-start gap-2.5">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{signal}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Button size="lg" asChild className="min-w-[180px]">
                <ResumeDownloadLink url={siteConfig.author.resumeUrl}>
                  <FileText className="mr-2 h-4 w-4" />
                  Download Resume
                </ResumeDownloadLink>
              </Button>
              <Link 
                href="/about" 
                onClick={handleReadAboutClick}
                className="inline-flex min-w-[180px] h-10 justify-center items-center gap-2 rounded-md px-4 py-2 text-base font-semibold text-foreground hover:text-primary transition-colors sm:justify-center"
              >
                See my work
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="flex flex-wrap gap-4 text-sm text-muted-foreground"
            >
              <a href={`mailto:${siteConfig.author.email}`} className="inline-flex items-center gap-2 hover:text-foreground">
                <Mail className="h-4 w-4" />
                {siteConfig.author.email}
              </a>
              <a href={siteConfig.author.phoneHref} className="inline-flex items-center gap-2 hover:text-foreground">
                <Phone className="h-4 w-4" />
                {siteConfig.author.phone}
              </a>
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {siteConfig.author.location}
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex items-center gap-5"
            >
              {[
                { href: siteConfig.social.github, icon: Github, label: "GitHub" },
                { href: siteConfig.social.linkedin, icon: Linkedin, label: "LinkedIn" },
                { href: `mailto:${siteConfig.author.email}`, icon: Mail, label: "Email" },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target={social.href.startsWith('mailto') ? undefined : "_blank"}
                  rel={social.href.startsWith('mailto') ? undefined : "noopener noreferrer"}
                  className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                  <span>{social.label}</span>
                </a>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
