import { Button } from "../ui/button";
import { ArrowRightIcon, GitHubIcon, StarIcon } from "../icons/icons";
import { DocumentMachineAnimation } from "../animations/document-machine-animation";
import Link from "next/link";

export function HeroSection() {
  return (
    <div className="mb-12 text-center">

      {/* Animated Hero */}
      <div className="mb-6 sm:mb-8">
        <DocumentMachineAnimation />
      </div>

      {/* Description */}
      <p className="mx-auto mb-8 max-w-2xl px-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mb-10 sm:px-0 md:text-lg lg:text-xl">
        Transform your documents into audio. Listen to PDFs, translate content,
        and consume information on the go with AI-powered voice technology.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-col items-center justify-center gap-4 px-4 sm:flex-row sm:px-0">
        <Link href="/resources" className="sm:w-auto">
          <Button
            variant="primary"
            className="group w-full"
            rightIcon={
              <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
            }
          >
            Try It Free
          </Button>
        </Link>
        <Button
          variant="secondary"
          leftIcon={<GitHubIcon />}
          className="sm:w-auto"
          rightIcon={
            <span className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400">
              <StarIcon />
              401
            </span>
          }
        >
          Stars
        </Button>
      </div>
    </div>
  );
}
