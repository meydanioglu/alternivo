"use client";

import { Button, Drawer } from "@heroui/react";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MORE_LINKS, NAV_LINKS } from "./nav-links";

const itemClass = "block rounded-md px-3 py-2.5 text-[15px] hover:bg-surface-secondary";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

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
              <nav aria-label="Mobile" className="flex flex-col gap-5">
                <ul className="flex flex-col">
                  {NAV_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} onClick={close} className={`${itemClass} font-medium`}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div>
                  <p className="eyebrow px-3 pb-1">More</p>
                  <ul className="flex flex-col">
                    {MORE_LINKS.map((link) => (
                      <li key={link.href}>
                        <Link href={link.href} onClick={close} className={itemClass}>
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <ul className="flex flex-col border-t border-border pt-3">
                  <li>
                    <Link href="/submit" onClick={close} className={itemClass}>
                      Submit a product
                    </Link>
                  </li>
                  {signedIn && (
                    <li>
                      <Link href="/maker" onClick={close} className={itemClass}>
                        Maker dashboard
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link href={signedIn ? "/account" : "/login"} onClick={close} className={itemClass}>
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
