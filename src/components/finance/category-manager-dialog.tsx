"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Tags } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createFinanceCategory,
  deleteFinanceCategory,
  updateFinanceCategory,
} from "@/lib/finance/actions";
import { CATEGORY_GROUP_LABEL, type Category, type CategoryGroup } from "@/lib/finance/types";

const GROUP_ITEMS: Record<CategoryGroup, string> = CATEGORY_GROUP_LABEL;
const GROUPS: CategoryGroup[] = ["casa", "pessoal", "negocio", "outro"];

export function CategoryManagerDialog({
  categories,
  trigger,
}: {
  categories: Category[];
  trigger: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gradient-violet">
            <Tags className="size-4" />
            Categorias
          </DialogTitle>
        </DialogHeader>
        <CategoryManagerBody key={isOpen ? "open" : "closed"} categories={categories} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryManagerBody({ categories }: { categories: Category[] }) {
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<CategoryGroup>("outro");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      await createFinanceCategory(name, newGroup);
      setNewName("");
      setNewGroup("outro");
      toast.success("Categoria criada.");
    } catch {
      toast.error("Não foi possível criar a categoria.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-4 py-2">
      <p className="text-xs text-muted-foreground">
        Organize suas categorias por grupo — use <strong>Casa</strong> para contas domésticas (água, luz, aluguel,
        mercado...), e os demais grupos para separar gastos pessoais e de negócio.
      </p>

      <div className="space-y-2">
        {categories.length === 0 && (
          <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Nenhuma categoria ainda. Crie a primeira abaixo.
          </p>
        )}
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 pt-4">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
          placeholder="Nova categoria..."
          className="h-9 flex-1"
        />
        <Select value={newGroup} onValueChange={(v) => v && setNewGroup(v as CategoryGroup)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((g) => (
              <SelectItem key={g} value={g}>
                {GROUP_ITEMS[g]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="icon" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
          {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [name, setName] = useState(category.name);
  const [group, setGroup] = useState<CategoryGroup>(category.group);
  const [isPending, startTransition] = useTransition();

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === category.name) {
      setName(category.name);
      return;
    }
    startTransition(async () => {
      await updateFinanceCategory(category.id, trimmed, group);
      toast.success("Categoria atualizada.");
    });
  }

  function changeGroup(value: string | null) {
    if (!value) return;
    const nextGroup = value as CategoryGroup;
    setGroup(nextGroup);
    startTransition(async () => {
      await updateFinanceCategory(category.id, name, nextGroup);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteFinanceCategory(category.id);
      toast.success("Categoria removida.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        disabled={isPending}
        className="h-9 flex-1"
      />
      <Select value={group} onValueChange={changeGroup}>
        <SelectTrigger className="w-32" disabled={isPending}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GROUPS.map((g) => (
            <SelectItem key={g} value={g}>
              {GROUP_ITEMS[g]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="icon"
        variant="ghost"
        onClick={handleDelete}
        disabled={isPending}
        className="text-priority-urgent hover:text-priority-urgent"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
