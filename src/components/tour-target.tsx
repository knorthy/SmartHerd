import { useCallback, type ReactNode } from 'react';
import { View, type HostInstance, type ViewStyle } from 'react-native';

/** Elements the spotlight tour can highlight, by id. Mounted views register themselves here. */
export const tourTargets = new Map<string, HostInstance>();

export function useTourTarget(id: string) {
  return useCallback(
    (v: HostInstance | null) => {
      if (v) tourTargets.set(id, v);
      else if (tourTargets.get(id)) tourTargets.delete(id);
    },
    [id],
  );
}

export function TourTarget({ id, children, style }: { id: string; children: ReactNode; style?: ViewStyle }) {
  const ref = useTourTarget(id);
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
