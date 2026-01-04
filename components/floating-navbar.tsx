"use client"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useRouter } from "next/navigation"

export function FloatingNavbar() {
  const router = useRouter()

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" })
    }
  }

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4 py-4">
      <div className="mx-auto max-w-7xl rounded-2xl border-2 border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => scrollToSection("home")} className="cursor-pointer">
            <div className="flex items-center [filter:drop-shadow(0_2px_8px_rgb(0_0_0_/_40%))]">
              <Image
                src="/icon.png"
                alt="Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
          </button>

          {/* Navigation Links */}
          <div className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => scrollToSection("features")}
              className="text-sm font-open-sans-custom text-gray-300 transition-colors hover:text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm font-open-sans-custom text-gray-300 transition-colors hover:text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]"
            >
              Pricing
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-sm font-open-sans-custom text-gray-300 transition-colors hover:text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]"
            >
              About
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-sm font-open-sans-custom text-gray-300 transition-colors hover:text-white [text-shadow:_0_2px_6px_rgb(0_0_0_/_40%)]"
            >
              Contact
            </button>
          </div>

          {/* CTA Button */}
          <Button
            size="sm"
            onClick={() => router.push('/signup')}
            className="bg-white text-black hover:bg-gray-100 [text-shadow:_0_1px_2px_rgb(0_0_0_/_10%)] font-open-sans-custom"
          >
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  )
}
