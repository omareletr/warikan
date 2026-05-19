"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { LineItem } from "@/lib/types";
import { formatCurrency } from "@/lib/calculate";

interface LineItemRowProps {
  item: LineItem;
  onUpdate: (item: LineItem) => void;
  onRemove: () => void;
}

export function LineItemRow({ item, onUpdate, onRemove }: LineItemRowProps) {
  const [editing, setEditing] = useState(!item.name);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [price, setPrice] = useState(item.price.toString());

  function save() {
    onUpdate({
      ...item,
      name: name.trim() || item.name,
      quantity: parseInt(quantity) || 1,
      price: parseFloat(price) || 0,
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

  if (editing) {
    return (
      <div className="flex items-center gap-3 py-3.5">
        <Input
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-14"
          type="number"
          min="1"
          placeholder="Qty"
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
        />
        <div className="relative w-24">
          <Input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full"
            type="number"
            step="0.01"
            placeholder="Price"
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
          {(parseInt(quantity) || 1) > 1 && <span className="absolute -bottom-4 right-0 text-[10px] text-muted-foreground">each</span>}
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={cancel}>
          <X className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={save}>
          Done
        </Button>
      </div>
    );
  }

  return (
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
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
