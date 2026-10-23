"use client";

import { Button, Drawer } from "@heroui/react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS } from "./nav-links";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="sm" isIconOnly aria-label="Open menu" className="lg:hidden" onPress={() => setIsOpen(true)}>
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      <Drawer.Backdrop isOpen={isOpen} onOpenChange={setIsOpen}>
        <Drawer.Content placement="left">
          <Drawer.Dialog aria-label="Main menu">
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading>Menu</Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body>
              <nav aria-label="Mobile">
                <ul className="flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        className="block rounded-md px-3 py-2 text-base hover:bg-surface-secondary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                  <li className="mt-2 border-t border-border pt-2">
                    <Link href="/submit" onClick={() => setIsOpen(false)} className="block rounded-md px-3 py-2 text-base hover:bg-surface-secondary">
                      Submit a product
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={signedIn ? "/account" : "/login"}
                      onClick={() => setIsOpen(false)}
                      className="block rounded-md px-3 py-2 text-base hover:bg-surface-secondary"
                    >
                      {signedIn ? "Your account" : "Sign in"}
                    </Link>
                  </li>
                </ul>
              </nav>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
