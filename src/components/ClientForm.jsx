import React from 'react';
import { vibe } from '../utils/telegram';

export default function ClientForm({ client, setClient }) {
    
    // Функція, яка оновлює дані при вводі (і додає маску для телефону)
    const handleChange = (e) => {
        let { name, value } = e.target;
        
        // Маска для телефону
        if (name === 'phone') {
            let digits = value.replace(/\D/g, '');
            if (digits.startsWith('380')) digits = digits.substring(3);
            else if (digits.startsWith('80')) digits = digits.substring(2);
            else if (digits.startsWith('0')) digits = digits.substring(1);
            let res = '+380';
            if (digits.length > 0) res += ' (' + digits.substring(0, 2);
            if (digits.length >= 3) res += ') ' + digits.substring(2, 5);
            if (digits.length >= 6) res += '-' + digits.substring(5, 7);
            if (digits.length >= 8) res += '-' + digits.substring(7, 9);
            value = res;
        }

        setClient(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="animated-step">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>👷 Інформація про об'єкт</h3>
                {/* Перемикач теми зробимо пізніше глобально */}
            </div>

            <label>Ім'я клієнта</label>
            <input type="text" name="name" value={client.name || ''} onChange={handleChange} placeholder="Введіть ім'я" />

            <label>Телефон</label>
            <input type="tel" name="phone" inputMode="tel" value={client.phone || ''} onChange={handleChange} placeholder="+380 (XX) XXX-XX-XX" />

            <label>Тип об'єкту</label>
            <select name="object_type" value={client.object_type || 'Квартира (Новобудова)'} onChange={handleChange}>
                <option value="Квартира (Новобудова)">Квартира (Новобудова)</option>
                <option value="Квартира (Вторинна)">Квартира (Вторинна)</option>
                <option value="Будинок">Будинок</option>
                <option value="Комерція">Комерція</option>
            </select>

            <label>Адреса</label>
            <input type="text" name="address" value={client.address || ''} onChange={handleChange} placeholder="Вулиця / ЖК" />

            <label>Загальна площа об'єкта (м²)</label>
            <input type="number" inputMode="decimal" name="area" value={client.area || ''} onChange={handleChange} placeholder="Наприклад: 65" />

            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                    <label>Поверх</label>
                    <input type="number" inputMode="numeric" name="floor" value={client.floor || '1'} onChange={handleChange} placeholder="1" />
                </div>
                <div style={{ flex: 1 }}>
                    <label>Ліфт</label>
                    <select name="elevator" value={client.elevator || 'Немає'} onChange={handleChange}>
                        <option value="Вантажний">Вантажний</option>
                        <option value="Пасажирський">Пасажирський</option>
                        <option value="Немає">Немає</option>
                    </select>
                </div>
            </div>
        </div>
    );
}