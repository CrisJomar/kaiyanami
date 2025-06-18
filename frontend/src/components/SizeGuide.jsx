import React from 'react';

const SizeGuide = ({ category = 'general' }) => {
  // Different size charts based on product category
  const sizeCharts = {
    men: {
      title: "Men's Size Guide",
      headers: ['Size', 'Chest (in)', 'Waist (in)', 'Hips (in)'],
      rows: [
        ['S', '35-37', '29-31', '35-37'],
        ['M', '38-40', '32-34', '38-40'],
        ['L', '41-43', '35-37', '41-43'],
        ['XL', '44-46', '38-40', '44-46'],
        ['XXL', '47-49', '41-43', '47-49'],
      ],
      note: "Measurements refer to body size, not garment dimensions."
    },
    women: {
      title: "Women's Size Guide",
      headers: ['Size', 'Bust (in)', 'Waist (in)', 'Hips (in)'],
      rows: [
        ['S', '33-35', '25-27', '35-37'],
        ['M', '36-38', '28-30', '38-40'],
        ['L', '39-41', '31-33', '41-43'],
        ['XL', '42-44', '34-36', '44-46'],
        ['XXL', '45-47', '37-39', '47-49'],
      ],
      note: "Measurements refer to body size, not garment dimensions."
    },
    general: {
      title: "General Size Guide",
      headers: ['Size', 'S', 'M', 'L', 'XL'],
      rows: [
        ['US', '4-6', '8-10', '12-14', '16-18'],
        ['UK', '8-10', '12-14', '16-18', '20-22'],
        ['EU', '36-38', '40-42', '44-46', '48-50'],
      ],
      note: "Sizes are approximate and may vary by style and brand."
    }
  };


  const chart = sizeCharts[category.toLowerCase()] || sizeCharts.general;
  
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">{chart.title}</h3>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {chart.headers.map((header, index) => (
                <th 
                  key={index}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chart.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {row.map((cell, cellIndex) => (
                  <td 
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {chart.note && (
        <p className="mt-4 text-sm text-gray-500">{chart.note}</p>
      )}
      
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-2">How to Measure</h4>
        <ul className="list-disc pl-5 text-sm text-gray-500 space-y-1">
          <li>Chest/Bust: Measure around the fullest part of your chest/bust.</li>
          <li>Waist: Measure around the narrowest part of your waist.</li>
          <li>Hips: Measure around the fullest part of your hips.</li>
        </ul>
      </div>
    </div>
  );
};

export default SizeGuide;