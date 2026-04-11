// Kin AI — Family Calendar Screen (Track C1.6)
// Merged household calendar view in Family tab
// Shows both parents' shared events, kids' activities
// Conflict alerts at top of day's list
// Week navigation via swipe left/right
// Brand Guide v2 compliant
// Author: Lead Engineer (Track C1)
// Date: 2026-04-02

import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  GestureResponderEvent,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getCurrentParent, getParentHousehold } from '../../../lib/auth'
import {
  getHouseholdCalendarForDay,
  getConflictsForDate,
  formatConflictAlert,
  type HouseholdCalendarEvent,
  type ConflictAlert,
} from '../household-calendar'

// ============================================================================
// TYPES
// ============================================================================

interface DayPill {
  dayName: string
  dayNum: number
  dateStr: string
  isToday: boolean
}

// ============================================================================
// BRAND COLORS
// ============================================================================

const BRAND = {
  background: '#0C0F0A',
  surface: '#141810',
  calendar: '#A07EC8',
  primary: '#7CB87A',
  text: '#F0EDE6',
  textDim: '#9E9B94',
  error: '#E07B5A',
}

const OWNER_COLORS = {
  parent1: '#7CB87A',
  parent2: '#A07EC8',
  kid: '#E07B5A',
  shared: '#F0EDE6',
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${BRAND.text}10`,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: BRAND.text,
    marginBottom: 16,
    fontFamily: 'Geist-SemiBold',
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  dayPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 70,
    alignItems: 'center',
  },
  dayPillToday: {
    backgroundColor: BRAND.primary,
  },
  dayPillOther: {
    backgroundColor: BRAND.surface,
    borderColor: `${BRAND.text}10`,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    color: BRAND.textDim,
    marginBottom: 2,
    fontFamily: 'Geist-Medium',
  },
  dayNameToday: {
    color: BRAND.background,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND.text,
    fontFamily: 'Geist-SemiBold',
  },
  dayNumToday: {
    color: BRAND.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  conflictAlert: {
    backgroundColor: `${BRAND.error}20`,
    borderLeftWidth: 4,
    borderLeftColor: BRAND.error,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  conflictAlertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.error,
    marginBottom: 6,
    fontFamily: 'Geist-SemiBold',
  },
  conflictAlertText: {
    fontSize: 12,
    color: BRAND.text,
    lineHeight: 16,
    fontFamily: 'Geist-Regular',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: BRAND.textDim,
    fontFamily: 'Geist-Regular',
  },
  eventItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  eventColorBar: {
    width: 4,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  eventContent: {
    flex: 1,
    marginLeft: 12,
  },
  eventTime: {
    fontSize: 11,
    color: BRAND.textDim,
    marginBottom: 4,
    fontFamily: 'Geist-Regular',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: BRAND.text,
    marginBottom: 2,
    fontFamily: 'Geist-Medium',
  },
  eventOwner: {
    fontSize: 11,
    color: BRAND.textDim,
    fontFamily: 'Geist-Regular',
  },
  eventLocation: {
    fontSize: 11,
    color: BRAND.textDim,
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: 'Geist-Regular',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabText: {
    fontSize: 24,
  },
  footer: {
    height: 80,
  },
})

// ============================================================================
// COMPONENT
// ============================================================================

export default function FamilyCalendarScreen() {
  const [parent, setParent] = useState(null)
  const [household, setHousehold] = useState(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarEvents, setCalendarEvents] = useState<HouseholdCalendarEvent[]>([])
  const [conflicts, setConflicts] = useState<ConflictAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    loadCalendarData()
  }, [selectedDate, household])

  const loadInitialData = async () => {
    try {
      const currentParent = await getCurrentParent()
      setParent(currentParent)

      if (currentParent) {
        const parentHousehold = await getParentHousehold(currentParent.id)
        setHousehold(parentHousehold)
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCalendarData = async () => {
    if (!household) return

    try {
      const dateStr = selectedDate.toISOString().split('T')[0]

      const [events, dayConflicts] = await Promise.all([
        getHouseholdCalendarForDay(household.id, dateStr),
        getConflictsForDate(household.id, dateStr),
      ])

      setCalendarEvents(events)
      setConflicts(dayConflicts)
    } catch (error) {
      console.error('Error loading calendar data:', error)
    }
  }

  // ========== DATE NAVIGATION ==========

  const getWeekDays = (): DayPill[] => {
    const days: DayPill[] = []
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const isToday =
        day.toISOString().split('T')[0] === today.toISOString().split('T')[0]

      days.push({
        dayName: dayNames[day.getDay()],
        dayNum: day.getDate(),
        dateStr: day.toISOString().split('T')[0],
        isToday,
      })
    }

    return days
  }

  const weekDays = getWeekDays()

  const handleDayPress = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    setSelectedDate(new Date(year, month - 1, day))
  }

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  // ========== RENDER ==========

  const selectedDateStr = selectedDate.toISOString().split('T')[0]

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Family Calendar</Text>
      </View>

      {/* Week Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekStrip}
        scrollEventThrottle={16}
      >
        {weekDays.map((day) => (
          <TouchableOpacity
            key={day.dateStr}
            style={[
              styles.dayPill,
              day.isToday ? styles.dayPillToday : styles.dayPillOther,
            ]}
            onPress={() => handleDayPress(day.dateStr)}
          >
            <Text style={[styles.dayName, day.isToday && styles.dayNameToday]}>
              {day.dayName}
            </Text>
            <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>
              {day.dayNum}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Conflict Alerts */}
        {conflicts.map((conflict) => (
          <View key={conflict.id} style={styles.conflictAlert}>
            <Text style={styles.conflictAlertTitle}>
              {conflict.type === 'both_unavailable' ? 'SCHEDULING CONFLICT' : 'PICKUP ALERT'}
            </Text>
            <Text style={styles.conflictAlertText}>{conflict.description}</Text>
            {conflict.suggestedResolution && (
              <Text style={[styles.conflictAlertText, { marginTop: 8 }]}>
                💡 {conflict.suggestedResolution}
              </Text>
            )}
          </View>
        ))}

        {/* Calendar Events */}
        {calendarEvents.length > 0 ? (
          calendarEvents.map((event) => (
            <View
              key={event.id}
              style={[
                styles.eventItem,
                {
                  borderLeftColor: event.color,
                },
              ]}
            >
              <View style={styles.eventContent}>
                <Text style={styles.eventTime}>
                  {formatTime(event.start_at)} – {formatTime(event.end_at)}
                </Text>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.ownerName && (
                  <Text style={styles.eventOwner}>{event.ownerName}</Text>
                )}
                {event.location && (
                  <Text style={styles.eventLocation}>{event.location}</Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📭</Text>
            <Text style={styles.emptyStateText}>No events scheduled for this day</Text>
          </View>
        )}

        {/* Footer spacer for FAB */}
        <View style={styles.footer} />
      </ScrollView>

      {/* Add Event FAB */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
