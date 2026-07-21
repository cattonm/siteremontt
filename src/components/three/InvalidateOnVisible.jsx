// src/components/three/InvalidateOnVisible.jsx
// 3D-аудит п.8.1: коли frameloop повертається з "never" у "demand"/"always"
// (канвас знову у в'юпорті), явно просимо один кадр — інакше могла б
// лишитись стара картинка, якщо контент змінився, поки канвас був поза
// в'юпортом (наприклад, вибір матеріалу на іншій вкладці стору).
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export default function InvalidateOnVisible({ visible }) {
    const { invalidate } = useThree();
    useEffect(() => { if (visible) invalidate(); }, [visible, invalidate]);
    return null;
}
