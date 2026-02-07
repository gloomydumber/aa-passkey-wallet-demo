"use client";

/**
 * Network Selector Component
 *
 * Allows users to switch between supported networks.
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNetworkStore } from "@/stores/network-store";
import { ChevronDown, Check } from "lucide-react";

export function NetworkSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { activeNetwork, networks, switchNetwork } = useNetworkStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNetworkSelect = (chainId: number) => {
    switchNetwork(chainId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <span className="h-2 w-2 rounded-full bg-green-500" />
        {activeNetwork.displayName}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[200px] rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
          {networks.map((network) => (
            <button
              key={network.chainId}
              onClick={() => handleNetworkSelect(network.chainId)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    network.chainId === activeNetwork.chainId
                      ? "bg-green-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                />
                <span className="text-zinc-900 dark:text-zinc-50">{network.displayName}</span>
              </div>
              {network.chainId === activeNetwork.chainId && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
