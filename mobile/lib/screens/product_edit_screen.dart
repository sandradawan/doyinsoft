import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../api.dart';
import '../theme.dart';

/// Add (product == null) or edit a vendor's product.
class ProductEditScreen extends StatefulWidget {
  final Map<String, dynamic>? product;
  const ProductEditScreen({super.key, this.product});

  @override
  State<ProductEditScreen> createState() => _ProductEditScreenState();
}

class _ProductEditScreenState extends State<ProductEditScreen> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name, _tagline, _desc, _price, _category, _download;
  String _currency = 'NGN';
  String _type = 'digital';
  String _platform = 'web';
  String? _iconUrl;
  bool _saving = false;
  bool _uploading = false;

  bool get _isEdit => widget.product != null;

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _name = TextEditingController(text: p?['name']?.toString() ?? '');
    _tagline = TextEditingController(text: p?['tagline']?.toString() ?? '');
    _desc = TextEditingController(text: p?['description']?.toString() ?? '');
    _price = TextEditingController(
        text: p != null ? ((p['price_minor'] ?? 0) / 100).toStringAsFixed(2) : '');
    _category = TextEditingController(text: p?['category']?.toString() ?? '');
    _download = TextEditingController(text: p?['file_path']?.toString() ?? '');
    _currency = (p?['currency'] == 'USD') ? 'USD' : 'NGN';
    _type = ['digital', 'physical', 'service'].contains(p?['product_type']) ? p!['product_type'] : 'digital';
    _platform =
        ['web', 'desktop', 'mobile', 'free'].contains(p?['platform']) ? p!['platform'] : 'web';
    _iconUrl = p?['icon_url']?.toString();
  }

  @override
  void dispose() {
    for (final c in [_name, _tagline, _desc, _price, _category, _download]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickImage() async {
    final picked = await ImagePicker()
        .pickImage(source: ImageSource.gallery, maxWidth: 1200, imageQuality: 85);
    if (picked == null) return;
    setState(() => _uploading = true);
    String? url;
    try {
      url = await Api.instance.uploadProductImage(picked.path);
    } catch (e) {
      debugPrint('[ProductEdit._pickImage] $e');
    }
    if (!mounted) return;
    setState(() {
      _uploading = false;
      if (url != null) _iconUrl = url;
    });
    if (url == null) _snack('Image upload failed — check your connection and try again.');
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    if (_type == 'digital' && _download.text.trim().isEmpty) {
      _snack('Add a download link for digital products.');
      return;
    }
    setState(() => _saving = true);
    final body = {
      'name': _name.text.trim(),
      'tagline': _tagline.text.trim(),
      'description': _desc.text.trim(),
      'price': double.tryParse(_price.text.trim()) ?? 0,
      'currency': _currency,
      'product_type': _type,
      'platform': _platform,
      'category': _category.text.trim(),
      'download_url': _download.text.trim(),
      'icon_url': _iconUrl ?? '',
    };
    String? err;
    try {
      err = await Api.instance.saveVendorProduct(body, id: widget.product?['id'] as String?);
    } catch (e) {
      debugPrint('[ProductEdit._save] $e');
      err = 'Network error — check your connection and try again.';
    }
    if (!mounted) return;
    setState(() => _saving = false);
    if (err != null) {
      _snack(err);
      return;
    }
    Navigator.pop(context, true);
  }

  void _snack(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit product' : 'Add product')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _imagePicker(),
            const SizedBox(height: 18),
            _field(_name, 'Product name', required: true),
            _field(_tagline, 'Short tagline', hint: 'One line that sells it'),
            _field(_desc, 'Description', maxLines: 5),
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(
                flex: 2,
                child: _field(_price, 'Price', keyboard: TextInputType.number, required: true),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _dropdown('Currency', _currency, const ['NGN', 'USD'],
                    (v) => setState(() => _currency = v)),
              ),
            ]),
            _dropdown('Type', _type, const ['digital', 'physical', 'service'],
                (v) => setState(() => _type = v), labels: const {
              'digital': 'Digital / software',
              'physical': 'Physical item',
              'service': 'Service',
            }),
            _field(_category, 'Category', hint: 'e.g. Fashion, Gadgets, E-books'),
            if (_type == 'digital') ...[
              _dropdown('Platform', _platform, const ['web', 'desktop', 'mobile', 'free'],
                  (v) => setState(() => _platform = v)),
              _field(_download, 'Download link (URL)',
                  hint: 'https://… where buyers get the file', keyboard: TextInputType.url),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _saving ? null : _save,
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
              child: _saving
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(_isEdit ? 'Save changes' : 'Publish (sent for review)'),
            ),
            if (!_isEdit)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text('New products are reviewed before they go live.',
                    style: TextStyle(fontSize: 12, color: context.brand.inkSoft)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _imagePicker() {
    return Center(
      child: GestureDetector(
        onTap: _uploading ? null : _pickImage,
        child: Container(
          height: 140,
          width: 140,
          decoration: BoxDecoration(
            color: context.brand.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: context.brand.line),
            image: (_iconUrl != null && _iconUrl!.isNotEmpty)
                ? DecorationImage(image: NetworkImage(_iconUrl!), fit: BoxFit.cover)
                : null,
          ),
          child: _uploading
              ? const Center(child: CircularProgressIndicator(strokeWidth: 2))
              : (_iconUrl == null || _iconUrl!.isEmpty)
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo_outlined, color: context.brand.brand),
                        const SizedBox(height: 6),
                        const Text('Add photo', style: TextStyle(fontSize: 12)),
                      ],
                    )
                  : Align(
                      alignment: Alignment.bottomRight,
                      child: Container(
                        margin: const EdgeInsets.all(6),
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                            color: Colors.black54, borderRadius: BorderRadius.circular(8)),
                        child: const Icon(Icons.edit, size: 15, color: Colors.white),
                      ),
                    ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController c, String label,
      {String? hint, int maxLines = 1, bool required = false, TextInputType? keyboard}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: c,
        maxLines: maxLines,
        keyboardType: keyboard,
        decoration: InputDecoration(labelText: label, hintText: hint, border: const OutlineInputBorder()),
        validator: required ? (v) => (v == null || v.trim().isEmpty) ? '$label is required' : null : null,
      ),
    );
  }

  Widget _dropdown(String label, String value, List<String> options, ValueChanged<String> onChanged,
      {Map<String, String>? labels}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: InputDecorator(
        decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: value,
            isExpanded: true,
            items: options
                .map((o) => DropdownMenuItem(value: o, child: Text(labels?[o] ?? o)))
                .toList(),
            onChanged: (v) => v == null ? null : onChanged(v),
          ),
        ),
      ),
    );
  }
}
