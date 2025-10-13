const x = 1;
const y = 2;

function add(a, b) {
  console.log('Adding numbers:', a, b);
  const result = a + b;
  debugger;
  return result;
}

console.log('Starting test debug script');
const sum = add(x, y);
console.log('Sum is:', sum);
console.log('Test debug script finished');
