// Nick Di Lorenzo
// https://nickdilo55.github.io/asg0/src/asg0.html
// ndiloren@ucsc.edu

function main() {
  var canvas = document.getElementById('cnv1');
  window.canvas = canvas;
  window.ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  var originX = canvas.width / 2;
  var originY = canvas.height / 2;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.moveTo(originX, originY);
  ctx.lineTo(originX + v.elements[0] * 20, originY - v.elements[1] * 20);
  ctx.stroke();
}

function handleDrawOperationEvent() {
  ctx.fillStyle = 'rgba(0, 0, 0, 1.0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  var x1 = parseFloat(document.getElementById('xcoord1').value);
  var y1 = parseFloat(document.getElementById('ycoord1').value);
  var v1 = new Vector3([x1, y1, 0]);
  var x2 = parseFloat(document.getElementById('xcoord2').value);
  var y2 = parseFloat(document.getElementById('ycoord2').value);
  var v2 = new Vector3([x2, y2, 0]);

  drawVector(v1, "red");
  drawVector(v2, "blue");

  var op = document.getElementById('operationSelect').value;
  var scalar = parseFloat(document.getElementById('scalarValue').value);

  switch (op) {
    case "add":
    case "sub": {
      var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
      if (op === "add") {
        v3.add(v2);
      } else {
        v3.sub(v2);
      }
      drawVector(v3, "green");
      break;
    }
    case "mul":
    case "div": {
      var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
      var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
      if (op === "mul") {
        v3.mul(scalar);
        v4.mul(scalar);
      } else {
        v3.div(scalar);
        v4.div(scalar);
      }
      drawVector(v3, "green");
      drawVector(v4, "green");
      break;
    }
    case "mag":
    case "norm": {
      console.log("v1 magnitude: " + v1.magnitude());
      console.log("v2 magnitude: " + v2.magnitude());
      var v1n = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
      var v2n = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
      v1n.normalize();
      v2n.normalize();
      drawVector(v1n, "green");
      drawVector(v2n, "green");
      break;
    }
    case "angle": {
      var angleDeg = angleBetween(v1, v2);
      console.log("Angle between v1 and v2: " + angleDeg + " degrees");
      break;
    }
    case "area": {
      var area = areaTriangle(v1, v2);
      console.log("Area of triangle: " + area);
      break;
    }
    default:
      console.log("No valid operation selected");
  }
}

function angleBetween(v1, v2) {
  var dotVal = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  if (mag1 === 0 || mag2 === 0) return 0;
  var cosAlpha = Math.max(-1, Math.min(1, dotVal / (mag1 * mag2)));
  return Math.acos(cosAlpha) * (180 / Math.PI);
}

function areaTriangle(v1, v2) {
  var crossVec = Vector3.cross(v1, v2);
  return crossVec.magnitude() / 2;
}
