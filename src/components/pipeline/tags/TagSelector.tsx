import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, Tag, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { TagBadge } from "./TagBadge";
import { TagManagerDialog } from "./TagManagerDialog";
import type { DealTag } from "./types";

interface TagSelectorProps {
  dealId: string;
  currentTagIds: string[];
  onTagsChange?: () => void;
}

export function TagSelector({ dealId, currentTagIds, onTagsChange }: TagSelectorProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  // Fetch all tags
  const { data: allTags = [] } = useQuery({
    queryKey: ["deal-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as DealTag[];
    },
  });

  // Add tag to deal
  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("deal_tag_assignments")
        .insert({ deal_id: dealId, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tag-assignments", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onTagsChange?.();
    },
    onError: () => {
      toast.error("Erro ao adicionar tag");
    },
  });

  // Remove tag from deal
  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from("deal_tag_assignments")
        .delete()
        .eq("deal_id", dealId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deal-tag-assignments", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onTagsChange?.();
    },
    onError: () => {
      toast.error("Erro ao remover tag");
    },
  });

  const toggleTag = (tagId: string) => {
    if (currentTagIds.includes(tagId)) {
      removeTagMutation.mutate(tagId);
    } else {
      addTagMutation.mutate(tagId);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1.5"
          >
            <Tag className="h-3.5 w-3.5" />
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="flex items-center justify-between mb-2 pb-2 border-b">
            <span className="text-sm font-medium">Tags</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setOpen(false);
                setManagerOpen(true);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>

          {allTags.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground mb-2">Nenhuma tag criada</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setOpen(false);
                  setManagerOpen(true);
                }}
              >
                Criar primeira tag
              </Button>
            </div>
          ) : (
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {allTags.map((tag) => {
                const isSelected = currentTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors",
                      isSelected
                        ? "bg-muted"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <TagManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
    </>
  );
}
