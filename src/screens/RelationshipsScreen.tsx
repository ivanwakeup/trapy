import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Colors, Fonts, Shadow } from "../theme";
import { RELATIONSHIP_TYPES, Relationship } from "../data/relationships";

interface Props {
  onBack: () => void;
}

function RelationshipForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Relationship>;
  onSave: (name: string, type: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<string | null>(initial?.relationship_type ?? null);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) { setError("Give them a name."); return; }
    if (!type) { setError("Choose a relationship type."); return; }
    setError(null);
    onSave(name.trim(), type);
  }

  return (
    <>
      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={(v) => { setName(v); setError(null); }}
        placeholder="e.g. Mary, Mom, Alex"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="words"
        autoCorrect={false}
        autoFocus
      />

      <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Relationship</Text>
      <View style={styles.typeGrid}>
        {RELATIONSHIP_TYPES.map((rt) => (
          <Pressable
            key={rt.value}
            onPress={() => { setType(rt.value); setError(null); }}
            style={({ pressed, hovered }: any) => [
              styles.typePill,
              type === rt.value && styles.typePillSelected,
              hovered && type !== rt.value && styles.typePillHovered,
              pressed && styles.typePillPressed,
            ]}
          >
            <Text style={[styles.typePillText, type === rt.value && styles.typePillTextSelected]}>
              {rt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.formButtons}>
        <Pressable
          onPress={onCancel}
          style={({ hovered }: any) => [styles.cancelButton, hovered && styles.cancelButtonHovered]}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={Colors.surface} size="small" />
            : <Text style={styles.saveButtonText}>Save</Text>
          }
        </Pressable>
      </View>
    </>
  );
}

export default function RelationshipsScreen({ onBack }: Props) {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Relationship | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("relationships")
      .select("id, name, relationship_type, notes, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true });
    setRelationships(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(name: string, type: string) {
    setSaving(true);
    await supabase.from("relationships").insert({
      user_id: user!.id,
      name,
      relationship_type: type,
    });
    setSaving(false);
    setAddModalVisible(false);
    load();
  }

  async function handleEdit(name: string, type: string) {
    if (!editTarget) return;
    setSaving(true);
    await supabase
      .from("relationships")
      .update({ name, relationship_type: type })
      .eq("id", editTarget.id);
    setSaving(false);
    setEditTarget(null);
    load();
  }

  async function handleDelete(id: string) {
    await supabase.from("relationships").delete().eq("id", id);
    setDeleteConfirm(null);
    load();
  }

  function typeLabel(type: string | null) {
    if (!type) return "";
    return RELATIONSHIP_TYPES.find((r) => r.value === type)?.label ?? type;
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Relationships</Text>
        <Pressable
          onPress={() => setAddModalVisible(true)}
          style={({ pressed, hovered }: any) => [
            styles.addButton,
            hovered && styles.addButtonHovered,
            pressed && styles.addButtonPressed,
          ]}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : relationships.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No relationships yet.</Text>
          <Text style={styles.emptySubtitle}>Add people who matter to you.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {relationships.map((rel) => (
            <Pressable
              key={rel.id}
              onPress={() => setEditTarget(rel)}
              style={({ pressed, hovered }: any) => [
                styles.card,
                hovered && styles.cardHovered,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.cardMain}>
                <Text style={styles.cardName}>{rel.name}</Text>
                {rel.relationship_type && (
                  <Text style={styles.cardType}>{typeLabel(rel.relationship_type)}</Text>
                )}
              </View>
              <View style={styles.cardActions}>
                <Text style={styles.cardEditHint}>Edit</Text>
                <Pressable
                  onPress={(e) => { e.stopPropagation(); setDeleteConfirm(rel.id); }}
                  hitSlop={12}
                  style={({ hovered }: any) => [
                    styles.deleteButton,
                    hovered && styles.deleteButtonHovered,
                  ]}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Add relationship modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => !saving && setAddModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrapper}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Add someone</Text>
                <RelationshipForm
                  onSave={handleAdd}
                  onCancel={() => setAddModalVisible(false)}
                  saving={saving}
                />
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Edit relationship modal */}
      <Modal
        visible={editTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !saving && setEditTarget(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => !saving && setEditTarget(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalWrapper}
          >
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Edit</Text>
                {editTarget && (
                  <RelationshipForm
                    key={editTarget.id}
                    initial={editTarget}
                    onSave={handleEdit}
                    onCancel={() => setEditTarget(null)}
                    saving={saving}
                  />
                )}
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        visible={deleteConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDeleteConfirm(null)}>
          <Pressable style={styles.confirmSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>Remove this person?</Text>
            <Text style={styles.confirmSubtitle}>
              Their past check-ins won't be deleted, but they'll be removed from your relationships list.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                onPress={() => setDeleteConfirm(null)}
                style={({ hovered }: any) => [styles.cancelButton, hovered && styles.cancelButtonHovered]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => deleteConfirm && handleDelete(deleteConfirm)}
                style={styles.deleteConfirmButton}
              >
                <Text style={styles.deleteConfirmText}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backLink: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    width: 48,
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.accentSubtle,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  addButtonHovered: { backgroundColor: Colors.accentHover },
  addButtonPressed: { opacity: 0.7 },
  addButtonText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.accent,
  },
  scroll: { flex: 1 },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    ...Shadow.card,
  },
  cardHovered: {
    backgroundColor: Colors.surfaceHover,
  },
  cardPressed: {
    backgroundColor: Colors.surfacePressed,
  },
  cardMain: { flex: 1, gap: 2 },
  cardName: {
    fontSize: 16,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
  },
  cardType: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardEditHint: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonHovered: { backgroundColor: Colors.surfaceHover },
  deleteButtonText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontFamily: Fonts.sans,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Shared form styles
  fieldLabel: {
    fontSize: 12,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  typePillSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  typePillHovered: { borderColor: Colors.textMuted },
  typePillPressed: { opacity: 0.7 },
  typePillText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  typePillTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.sansMedium,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: "#C07888",
    marginTop: 14,
  },
  formButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonHovered: { backgroundColor: Colors.surfaceHover },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    color: Colors.surface,
    fontSize: 15,
    fontFamily: Fonts.sansSemiBold,
  },

  // Modals
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 18, 15, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalWrapper: {
    width: "100%",
    maxWidth: 480,
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    maxHeight: "85%",
    ...Shadow.card,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.serif,
    color: Colors.textPrimary,
    marginBottom: 24,
  },
  confirmSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 12,
    ...Shadow.card,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: Fonts.sansSemiBold,
    color: Colors.textPrimary,
  },
  confirmSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.sansLight,
    color: Colors.textMuted,
    lineHeight: 21,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#4A2028",
    borderWidth: 1,
    borderColor: "#8A3040",
  },
  deleteConfirmText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: "#C07888",
  },
});
