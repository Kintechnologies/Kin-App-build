// Kin AI — Onboarding Screen 3: Family Members
// Collects children and pets with allergy tracking
// Author: Lead Engineer
// Date: 2026-04-02

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native'
import Animated, { FadeIn, Layout } from 'react-native-reanimated'
import { useOnboardingStore, OnboardingChild, OnboardingPet } from './onboarding-state'

interface Screen3Props {
  onContinue: () => void
}

type FormMode = 'list' | 'addChild' | 'addPet'

const ALLERGY_OPTIONS = ['Dairy', 'Eggs', 'Nuts', 'Gluten', 'Soy', 'Other']
const PET_SPECIES = ['Dog', 'Cat', 'Other']

export const FamilyScreen: React.FC<Screen3Props> = ({ onContinue }) => {
  const children = useOnboardingStore((s) => s.children)
  const pets = useOnboardingStore((s) => s.pets)
  const addChild = useOnboardingStore((s) => s.addChild)
  const removeChild = useOnboardingStore((s) => s.removeChild)
  const addPet = useOnboardingStore((s) => s.addPet)
  const removePet = useOnboardingStore((s) => s.removePet)

  const [mode, setMode] = useState<FormMode>('list')

  // Child form state
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [childGrade, setChildGrade] = useState<string | null>(null)
  const [selectedAllergies, setSelectedAllergies] = useState<Set<string>>(new Set())
  const [otherAllergy, setOtherAllergy] = useState('')

  // Pet form state
  const [petName, setPetName] = useState('')
  const [petSpecies, setPetSpecies] = useState<string | null>(null)
  const [petBreed, setPetBreed] = useState('')
  const [petVetName, setPetVetName] = useState('')

  const handleAddChild = () => {
    if (!childName.trim() || !childAge.trim()) {
      return
    }

    const allergies = Array.from(selectedAllergies).map((allergy) =>
      allergy === 'Other' ? otherAllergy.toLowerCase() : allergy.toLowerCase()
    )

    const newChild: OnboardingChild = {
      name: childName,
      age: parseInt(childAge, 10),
      grade: childGrade,
      allergies,
    }

    addChild(newChild)

    // Reset form
    setChildName('')
    setChildAge('')
    setChildGrade(null)
    setSelectedAllergies(new Set())
    setOtherAllergy('')
    setMode('list')
  }

  const handleAddPet = () => {
    if (!petName.trim() || !petSpecies) {
      return
    }

    const newPet: OnboardingPet = {
      name: petName,
      species: petSpecies.toLowerCase(),
      breed: petBreed || null,
      vetName: petVetName || null,
    }

    addPet(newPet)

    // Reset form
    setPetName('')
    setPetSpecies(null)
    setPetBreed('')
    setPetVetName('')
    setMode('list')
  }

  const toggleAllergy = (allergy: string) => {
    const newSet = new Set(selectedAllergies)
    if (newSet.has(allergy)) {
      newSet.delete(allergy)
    } else {
      newSet.add(allergy)
    }
    setSelectedAllergies(newSet)
  }

  const childFormValid = childName.trim().length > 0 && childAge.trim().length > 0
  const petFormValid = petName.trim().length > 0 && petSpecies

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {mode === 'list' && (
          <Animated.View entering={FadeIn} style={styles.content}>
            <Text style={styles.header}>Who's in your family?</Text>
            <Text style={styles.subtext}>
              We'll plan meals around them, track their activities, and make sure nothing
              falls through the cracks.
            </Text>

            <View style={styles.spacing} />

            {/* Children Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Children</Text>

              {children.map((child, idx) => (
                <View key={idx} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={styles.itemName}>{child.name}</Text>
                      <Text style={styles.itemDetail}>Age {child.age}{child.grade ? ` • Grade ${child.grade}` : ''}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeChild(idx)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  {child.allergies.length > 0 && (
                    <View style={styles.allergyBadges}>
                      {child.allergies.map((allergen, allergyIdx) => (
                        <View key={allergyIdx} style={styles.allergyBadge}>
                          <Text style={styles.allergyBadgeText}>{allergen}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setMode('addChild')}
              >
                <Text style={styles.addButtonText}>+ Add a child</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.spacing} />

            {/* Pets Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pets</Text>

              {pets.map((pet, idx) => (
                <View key={idx} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View>
                      <Text style={styles.itemName}>{pet.name}</Text>
                      <Text style={styles.itemDetail}>
                        {pet.species}{pet.breed ? ` • ${pet.breed}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removePet(idx)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setMode('addPet')}
              >
                <Text style={styles.addButtonText}>+ Add a pet</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.spacing} />

            {/* Continue Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={onContinue}
            >
              <Text style={styles.buttonText}>Continue →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={onContinue}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {mode === 'addChild' && (
          <Animated.View entering={FadeIn} style={styles.content} layout={Layout}>
            <Text style={styles.formHeader}>Add a child</Text>

            <View style={styles.spacing} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mia"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={childName}
                onChangeText={setChildName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 7"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={childAge}
                onChangeText={setChildAge}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Grade (optional)</Text>
              <View style={styles.gradeOptions}>
                {['Pre-K', '1st', '2nd', '3rd', '4th', '5th'].map((grade) => (
                  <TouchableOpacity
                    key={grade}
                    style={[
                      styles.gradeOption,
                      childGrade === grade && styles.gradeOptionSelected,
                    ]}
                    onPress={() => setChildGrade(childGrade === grade ? null : grade)}
                  >
                    <Text
                      style={[
                        styles.gradeOptionText,
                        childGrade === grade && styles.gradeOptionTextSelected,
                      ]}
                    >
                      {grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Any food allergies?</Text>
              <Text style={styles.allergyNote}>Select all that apply</Text>

              {ALLERGY_OPTIONS.map((allergy) => (
                <Pressable
                  key={allergy}
                  onPress={() => toggleAllergy(allergy)}
                  style={styles.allergyCheckbox}
                >
                  <View
                    style={[
                      styles.checkbox,
                      selectedAllergies.has(allergy) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedAllergies.has(allergy) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.allergyLabel}>{allergy}</Text>
                </Pressable>
              ))}

              {selectedAllergies.has('Other') && (
                <TextInput
                  style={[styles.input, styles.otherAllergyInput]}
                  placeholder="Specify allergy"
                  placeholderTextColor="rgba(240, 237, 230, 0.4)"
                  value={otherAllergy}
                  onChangeText={setOtherAllergy}
                />
              )}
            </View>

            <View style={styles.spacing} />

            <TouchableOpacity
              style={[styles.button, !childFormValid && styles.buttonDisabled]}
              onPress={handleAddChild}
              disabled={!childFormValid}
            >
              <Text style={styles.buttonText}>Save child</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setMode('list')
                setChildName('')
                setChildAge('')
                setChildGrade(null)
                setSelectedAllergies(new Set())
                setOtherAllergy('')
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {mode === 'addPet' && (
          <Animated.View entering={FadeIn} style={styles.content} layout={Layout}>
            <Text style={styles.formHeader}>Add a pet</Text>

            <View style={styles.spacing} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Luna"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={petName}
                onChangeText={setPetName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Species</Text>
              <View style={styles.speciesOptions}>
                {PET_SPECIES.map((species) => (
                  <TouchableOpacity
                    key={species}
                    style={[
                      styles.speciesOption,
                      petSpecies === species && styles.speciesOptionSelected,
                    ]}
                    onPress={() =>
                      setPetSpecies(petSpecies === species ? null : species)
                    }
                  >
                    <Text
                      style={[
                        styles.speciesOptionText,
                        petSpecies === species && styles.speciesOptionTextSelected,
                      ]}
                    >
                      {species}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Breed (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Golden Retriever"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={petBreed}
                onChangeText={setPetBreed}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Vet name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="We'll remind you about appointments"
                placeholderTextColor="rgba(240, 237, 230, 0.4)"
                value={petVetName}
                onChangeText={setPetVetName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.spacing} />

            <TouchableOpacity
              style={[styles.button, !petFormValid && styles.buttonDisabled]}
              onPress={handleAddPet}
              disabled={!petFormValid}
            >
              <Text style={styles.buttonText}>Save pet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setMode('list')
                setPetName('')
                setPetSpecies(null)
                setPetBreed('')
                setPetVetName('')
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#0C0F0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  content: {
    width: '100%',
  },
  header: {
    fontSize: 28,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    marginBottom: 16,
  },
  formHeader: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif-Italic',
    color: '#F0EDE6',
    marginBottom: 16,
  },
  subtext: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
    lineHeight: 20,
  },
  spacing: {
    height: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCard: {
    backgroundColor: '#141810',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    marginBottom: 4,
  },
  itemDetail: {
    fontSize: 13,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.6)',
  },
  removeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeText: {
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
    color: '#E07B5A',
  },
  allergyBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  allergyBadge: {
    backgroundColor: 'rgba(212, 168, 67, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  allergyBadgeText: {
    fontSize: 12,
    fontFamily: 'Geist-SemiBold',
    color: '#D4A843',
  },
  addButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#7CB87A',
  },
  button: {
    width: '100%',
    backgroundColor: '#7CB87A',
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Geist-SemiBold',
    color: '#0C0F0A',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#7CB87A',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#141810',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: 'Geist-Regular',
    color: '#F0EDE6',
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0.2)',
  },
  gradeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradeOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#141810',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0.2)',
  },
  gradeOptionSelected: {
    backgroundColor: '#7CB87A',
    borderColor: '#7CB87A',
  },
  gradeOptionText: {
    fontSize: 13,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
  },
  gradeOptionTextSelected: {
    color: '#0C0F0A',
  },
  allergyNote: {
    fontSize: 12,
    fontFamily: 'Geist-Regular',
    color: 'rgba(240, 237, 230, 0.5)',
    marginBottom: 12,
  },
  allergyCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#7CB87A',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#7CB87A',
  },
  checkmark: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#0C0F0A',
  },
  allergyLabel: {
    fontSize: 14,
    fontFamily: 'Geist-Regular',
    color: '#F0EDE6',
  },
  otherAllergyInput: {
    marginTop: 12,
  },
  speciesOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  speciesOption: {
    flex: 1,
    backgroundColor: '#141810',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 184, 122, 0.2)',
  },
  speciesOptionSelected: {
    backgroundColor: '#7CB87A',
    borderColor: '#7CB87A',
  },
  speciesOptionText: {
    fontSize: 13,
    fontFamily: 'Geist-SemiBold',
    color: '#F0EDE6',
  },
  speciesOptionTextSelected: {
    color: '#0C0F0A',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Geist-SemiBold',
    color: '#7CB87A',
  },
}
