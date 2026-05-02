import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, Modal } from 'react-native'

type Props = {
  hpCurrent: number
  hpMax: number
  tempHP: number
  onDamage: (amount: number) => void
  onHeal: (amount: number) => void
  onSetTempHP: (amount: number) => void
}

export function HPBar({ hpCurrent, hpMax, tempHP, onDamage, onHeal, onSetTempHP }: Props) {
  const [modalMode, setModalMode] = useState<'damage' | 'heal' | 'temp' | null>(null)
  const [inputValue, setInputValue] = useState('')

  const hpPercent = Math.max(0, hpCurrent / hpMax)
  const barColor = hpPercent >= 0.5 ? 'bg-green' : hpPercent >= 0.25 ? 'bg-yellow' : 'bg-red'

  function confirm() {
    const amount = parseInt(inputValue, 10)
    if (isNaN(amount) || amount <= 0) { setModalMode(null); return }
    if (modalMode === 'damage') onDamage(amount)
    else if (modalMode === 'heal') onHeal(amount)
    else if (modalMode === 'temp') onSetTempHP(amount)
    setInputValue('')
    setModalMode(null)
  }

  return (
    <View>
      <View className="bg-overlay rounded-full h-4 overflow-hidden mb-1">
        <View className={`${barColor} h-full rounded-full`} style={{ width: `${hpPercent * 100}%` }} />
      </View>

      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-text font-bold text-lg">
          {hpCurrent} / {hpMax}
          {tempHP > 0 && <Text className="text-blue"> (+{tempHP} temp)</Text>}
        </Text>
      </View>

      <View className="flex-row gap-2">
        {[
          { label: 'Damage', mode: 'damage' as const, color: 'bg-red' },
          { label: 'Heal', mode: 'heal' as const, color: 'bg-green' },
          { label: 'Temp HP', mode: 'temp' as const, color: 'bg-blue' },
        ].map(({ label, mode, color }) => (
          <TouchableOpacity
            key={mode}
            onPress={() => { setInputValue(''); setModalMode(mode) }}
            className={`${color} rounded-lg px-3 py-2 flex-1 items-center`}
          >
            <Text className="text-base text-sm font-medium">{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={modalMode !== null} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-surface rounded-2xl p-6 w-64">
            <Text className="text-text font-bold text-lg mb-4 capitalize">{modalMode}</Text>
            <TextInput
              className="bg-overlay text-text rounded-xl px-4 py-3 text-center text-2xl mb-4"
              keyboardType="number-pad"
              value={inputValue}
              onChangeText={setInputValue}
              autoFocus
              placeholder="0"
              placeholderTextColor="#6c7086"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-overlay rounded-xl py-2 items-center"
                onPress={() => setModalMode(null)}
              >
                <Text className="text-muted">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary rounded-xl py-2 items-center"
                onPress={confirm}
              >
                <Text className="text-base font-semibold">Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
