"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LineItem } from "@/lib/types";
import { formatCurrency } from "@/lib/calculate";
import { cn } from "@/lib/utils";

interface LineItemRowProps {
  item: LineItem;
  onUpdate: (item: LineItem) => void;
  onRemove: () => void;
}

export function LineItemRow({ item, onUpdate, onRemove }: LineItemRowProps) {
  const [editing, setEditing] = useState(!item.name);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [price, setPrice] = useState(item.price.toString());

  function save() {
    onUpdate({
      ...item,
      name: name.trim() || item.name,
      quantity: Math.max(1, parseInt(quantity) || 1),
      price: Math.max(0, parseFloat(price) || 0),
    });
    setEditing(false);
  }

  function cancel() {
    setName(item.name);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
    setEditing(false);
  }

  const lineTotal = item.price * item.quantity;

  const deleteDialog = (
    <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove item?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{item.name || "This item"}</span>
            {" "}will be removed from the receipt.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={() => { setShowConfirm(false); onRemove(); }}>
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (editing) {
    return (
      <>
        <div
          className="flex items-center gap-3 py-2"
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) save(); }}
        >
          <Input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-12 px-2 text-center"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="1"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 min-w-0"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
          <div className="relative">
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={cn(
                "w-20 px-2 text-right tabular-nums",
                (parseInt(quantity) || 1) > 1 && "pr-7"
              )}
              inputMode="decimal"
              pattern="[0-9.]*"
              placeholder="0.00"
              onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
            />
            {(parseInt(quantity) || 1) > 1 && (
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                /ea
              </span>
            )}
          </div>
        </div>
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <div
        className="flex cursor-pointer items-center justify-between py-3.5"
        onClick={() => setEditing(true)}
      >
        <div className="flex items-center gap-2">
          {item.quantity > 1 && (
            <span className="flex h-6 w-8 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums">{item.quantity}</span>
          )}
          <span className="text-base">{item.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base font-medium tabular-nums">
            {formatCurrency(lineTotal)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {deleteDialog}
    </>
  );
}
