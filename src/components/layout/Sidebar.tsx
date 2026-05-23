"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight, ExternalLink, ShieldCheck } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
}

const mainItems: NavItem[] = [{ label: "Home", href: "/" }];

const productItems: NavItem[] = [
  { label: "Meetings", href: "/meetings" },
  { label: "Recordings", href: "#", badge: "Soon", disabled: true },
  { label: "Hub", href: "#", badge: "Soon", disabled: true },
  { label: "Whiteboards", href: "#", badge: "Soon", disabled: true },
  { label: "Notes", href: "#", badge: "Soon", disabled: true },
  { label: "Clips", href: "#", badge: "Soon", disabled: true },
  { label: "Canvas", href: "#", badge: "Soon", disabled: true },
  { label: "Tasks", href: "#", badge: "Soon", disabled: true },
  { label: "Scheduler", href: "#", badge: "Soon", disabled: true },
];

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

  const content = (
    <div
      className={[
        "flex items-center justify-between px-4 py-[5px] text-[14px] rounded-[12px] mx-1 transition-colors mb-[1px] select-none",
        isActive && !item.disabled
          ? "bg-[#eef5ff] text-[#0b6bde] font-semibold"
          : item.disabled
          ? "text-[#a0a0a0] cursor-not-allowed"
          : "text-[#222325] hover:bg-[#e7e7eb] font-normal cursor-pointer",
      ].join(" ")}
      style={{ minHeight: "32px" }}
    >
      <span>{item.label}</span>
      <div className="flex items-center gap-1">
        {item.badge && (
          <span className={`text-[11px] font-bold px-1.5 py-[2px] rounded-full leading-none ${item.badge === "Soon" ? "text-[#777] bg-[#f5f5f5] border border-[#e0e0e0]" : "text-[#0b6bde] bg-[#eef5ff] border border-[#bdd8ff]"}`}>
            {item.badge}
          </span>
        )}
        {item.external && !item.disabled && (
          <ExternalLink size={13} className="text-[#aaa]" />
        )}
      </div>
    </div>
  );

  // If disabled, just return the div (not clickable). If active, wrap in Next.js Link.
  if (item.disabled) return content;
  return <Link href={item.href}>{content}</Link>;
}

function ExpandItem({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-4 py-[5px] text-[14px] text-[#222325] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer transition-colors mb-[1px]"
        style={{ minHeight: "32px" }}
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          size={14}
          className={[
            "text-[#aaa] transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
        />
        <span>{label}</span>
      </div>
      {open && label === "My Account" && (
        <div className="pl-8">
          <Link href="/profile">
            <div className="px-4 py-[5px] text-[13px] text-[#333] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer">
              Profile
            </div>
          </Link>
          <Link href="/settings">
            <div className="px-4 py-[5px] text-[13px] text-[#333] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer">
              Settings
            </div>
          </Link>
        </div>
      )}
      {open && label === "Support" && (
        <div className="pl-8">
          <a
            href="https://support.zoom.us"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="px-4 py-[5px] text-[13px] text-[#0b6bde] hover:bg-[#e7e7eb] rounded-[12px] mx-1 cursor-pointer">
              Help Center
            </div>
          </a>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  return (
    <div className="w-[280px] h-full flex flex-col bg-white border-r border-[#ebebeb] shrink-0 overflow-y-auto">
      {/* Home */}
      <div className="pt-4 pb-1 px-2">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* My Products */}
      <div className="pb-1 px-2">
        <p className="px-4 py-2 text-[12px] font-medium text-[#696f79] tracking-normal">
          My Products
        </p>
        {productItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        <div className="px-4 pt-1 pb-3">
          <button className="text-[13px] text-[#0b6bde] hover:underline font-medium">
            Discover More Products
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#ebebeb] mx-4" />

      {/* Account section */}
      <div className="pt-1 pb-4 px-2">
        <ExpandItem label="My Account" />
        <ExpandItem label="Admin" />
        <ExpandItem label="Support" />
      </div>

      {/* Shield at bottom */}
      <div className="mt-auto px-5 pb-5">
        <div className="w-9 h-9 bg-[#0b6bde] rounded-lg flex items-center justify-center text-white shadow-sm cursor-pointer hover:bg-[#0047cc] transition-colors">
          <ShieldCheck size={20} />
        </div>
      </div>
    </div>
  );
}
